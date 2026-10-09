using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using QrCar.Application.Features.PublicScan;
using QrCar.Application.Features.PublicScan.Dtos;

namespace QrCar.Api.Controllers;

/// <summary>
/// The anonymous surface reached by scanning a sticker. GET lookups used by the public
/// browser page never return owner or vehicle details. Contact data is issued only after
/// the official scanner validates a token and receives a short-lived scan grant.
/// </summary>
[ApiController]
[Route("api/v1/public")]
[AllowAnonymous]
public class PublicController : ControllerBase
{
    private readonly IPublicScanService _publicScanService;

    public PublicController(IPublicScanService publicScanService)
    {
        _publicScanService = publicScanService;
    }

    /// <summary>The reason chips shown on the scan page.</summary>
    [HttpGet("reasons")]
    [ProducesResponseType(typeof(IReadOnlyList<ParkingReasonOption>), StatusCodes.Status200OK)]
    public ActionResult<IReadOnlyList<ParkingReasonOption>> GetReasons()
    {
        Response.Headers.CacheControl = "public, max-age=3600";
        return Ok(_publicScanService.GetReasons());
    }

    /// <summary>
    /// Public sticker URL lookup. Does not confirm whether the token exists and never
    /// returns phone, location, or other vehicle fields. Query flags such as fromApp
    /// are ignored.
    /// </summary>
    [HttpGet("cars/{token}")]
    [EnableRateLimiting(RateLimitPolicies.PublicScan)]
    [ProducesResponseType(typeof(PublicBrowserAccessResponse), StatusCodes.Status200OK)]
    public ActionResult<PublicBrowserAccessResponse> GetCarByToken(string token)
    {
        Response.Headers.CacheControl = "no-store";
        return Ok(_publicScanService.GetBrowserAccess());
    }

    /// <summary>
    /// Token-based Call is closed. Knowing the printed sticker token is not enough.
    /// </summary>
    [HttpGet("cars/{token}/call")]
    [EnableRateLimiting(RateLimitPolicies.PublicScan)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public IActionResult CallOwnerByToken(string token) => NotFound();

    [HttpGet("cars/{token}/whatsapp")]
    [EnableRateLimiting(RateLimitPolicies.PublicScan)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public IActionResult WhatsAppOwnerByToken(string token) => NotFound();

    /// <summary>
    /// Official scanner validation. Looks up the token, records a scan, and issues a
    /// short-lived grant for Call / WhatsApp. This is not native-app attestation.
    /// </summary>
    [HttpPost("scans")]
    [EnableRateLimiting(RateLimitPolicies.PublicScan)]
    [ProducesResponseType(typeof(OfficialScanResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status410Gone)]
    public async Task<ActionResult<OfficialScanResponse>> CreateOfficialScan(
        [FromBody] CreateOfficialScanRequest request,
        CancellationToken cancellationToken)
    {
        Response.Headers.CacheControl = "no-store";
        return Ok(await _publicScanService.CreateOfficialScanAsync(request.Token, cancellationToken));
    }

    [HttpGet("scans/{scanId}/call")]
    [EnableRateLimiting(RateLimitPolicies.PublicScan)]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> CallOwner(string scanId, CancellationToken cancellationToken)
    {
        var phone = await _publicScanService.GetOwnerPhoneForScanAsync(scanId, cancellationToken);
        return ContactLaunchPage("Call", $"tel:{phone}");
    }

    [HttpGet("scans/{scanId}/whatsapp")]
    [EnableRateLimiting(RateLimitPolicies.PublicScan)]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> WhatsAppOwner(string scanId, CancellationToken cancellationToken)
    {
        var phone = await _publicScanService.GetOwnerPhoneForScanAsync(scanId, cancellationToken);
        var digits = new string(phone.Where(char.IsDigit).ToArray());
        return ContactLaunchPage("Open WhatsApp", $"https://wa.me/{digits}");
    }

    /// <summary>
    /// Proxies (Cloudflare Pages) drop 302 Location headers, which left a black tab on phones.
    /// A 200 HTML page with a refresh + link still reaches WhatsApp and the dialer.
    /// </summary>
    private static ContentResult ContactLaunchPage(string label, string url)
    {
        var safe = System.Net.WebUtility.HtmlEncode(url);
        return new ContentResult
        {
            StatusCode = StatusCodes.Status200OK,
            ContentType = "text/html; charset=utf-8",
            Content =
                $"<!doctype html><html><head><meta charset=\"utf-8\">" +
                $"<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">" +
                $"<meta http-equiv=\"refresh\" content=\"0;url={safe}\">" +
                $"<title>{label}</title></head>" +
                $"<body style=\"font-family:system-ui;padding:1.5rem\">" +
                $"<p><a href=\"{safe}\">{label}</a></p></body></html>",
        };
    }

    /// <summary>
    /// Token-based parking requests are closed. Knowing the printed sticker token is not enough.
    /// </summary>
    [HttpPost("cars/{token}/requests")]
    [EnableRateLimiting(RateLimitPolicies.PublicRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public IActionResult CreateRequestByToken(string token) => NotFound();

    /// <summary>
    /// Asks the owner to come to their car after official scanner validation.
    /// The response carries only a tracking reference.
    /// </summary>
    [HttpPost("scans/{scanId}/requests")]
    [EnableRateLimiting(RateLimitPolicies.PublicRequest)]
    [ProducesResponseType(typeof(ParkingRequestCreatedResponse), StatusCodes.Status202Accepted)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    [ProducesResponseType(StatusCodes.Status429TooManyRequests)]
    public async Task<ActionResult<ParkingRequestCreatedResponse>> CreateRequest(
        string scanId,
        CreateParkingRequestRequest request,
        CancellationToken cancellationToken)
    {
        var response = await _publicScanService.CreateRequestForScanAsync(
            scanId,
            request,
            HttpContext.Connection.RemoteIpAddress?.ToString(),
            Request.Headers.UserAgent.ToString(),
            cancellationToken);

        return Accepted(response);
    }

    /// <summary>Lets the scanner poll their own request to see whether the owner replied.</summary>
    [HttpGet("requests/{trackingRef}")]
    [EnableRateLimiting(RateLimitPolicies.PublicScan)]
    [ProducesResponseType(typeof(PublicRequestStatusResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<PublicRequestStatusResponse>> GetRequestStatus(
        string trackingRef,
        CancellationToken cancellationToken)
    {
        Response.Headers.CacheControl = "no-store";
        return Ok(await _publicScanService.GetRequestStatusAsync(trackingRef, cancellationToken));
    }
}
