using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using QrCar.Application.Features.PublicScan;
using QrCar.Application.Features.PublicScan.Dtos;

namespace QrCar.Api.Controllers;

/// <summary>
/// The anonymous surface reached by scanning a sticker. Every response here is visible to the
/// whole internet, so nothing that identifies the owner may be returned.
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
    /// Resolves a scanned token to a minimal description of the car. Returns 410 when the
    /// sticker belongs to a car that has since been removed.
    /// </summary>
    [HttpGet("cars/{token}")]
    [EnableRateLimiting(RateLimitPolicies.PublicScan)]
    [ProducesResponseType(typeof(PublicCarResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status410Gone)]
    public async Task<ActionResult<PublicCarResponse>> GetCarByToken(
        string token,
        CancellationToken cancellationToken)
    {
        Response.Headers.CacheControl = "no-store";
        return Ok(await _publicScanService.GetCarByTokenAsync(token, cancellationToken));
    }

    /// <summary>
    /// Hands the phone's dialer the number without putting it in the scan page HTML.
    /// The number still appears on the call screen — that is how a phone call works.
    /// </summary>
    [HttpGet("cars/{token}/call")]
    [EnableRateLimiting(RateLimitPolicies.PublicScan)]
    [ProducesResponseType(StatusCodes.Status302Found)]
    public async Task<IActionResult> CallOwner(string token, CancellationToken cancellationToken)
    {
        var phone = await _publicScanService.GetOwnerPhoneAsync(token, cancellationToken);
        Response.Headers.Location = $"tel:{phone}";
        return StatusCode(StatusCodes.Status302Found);
    }

    [HttpGet("cars/{token}/whatsapp")]
    [EnableRateLimiting(RateLimitPolicies.PublicScan)]
    [ProducesResponseType(StatusCodes.Status302Found)]
    public async Task<IActionResult> WhatsAppOwner(string token, CancellationToken cancellationToken)
    {
        var phone = await _publicScanService.GetOwnerPhoneAsync(token, cancellationToken);
        var digits = new string(phone.Where(char.IsDigit).ToArray());
        return Redirect($"https://wa.me/{digits}");
    }

    /// <summary>
    /// Asks the owner to come to their car. The response carries only a tracking reference:
    /// the requester never learns who the owner is or how they were contacted.
    /// </summary>
    [HttpPost("cars/{token}/requests")]
    [EnableRateLimiting(RateLimitPolicies.PublicRequest)]
    [ProducesResponseType(typeof(ParkingRequestCreatedResponse), StatusCodes.Status202Accepted)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    [ProducesResponseType(StatusCodes.Status429TooManyRequests)]
    public async Task<ActionResult<ParkingRequestCreatedResponse>> CreateRequest(
        string token,
        CreateParkingRequestRequest request,
        CancellationToken cancellationToken)
    {
        var response = await _publicScanService.CreateRequestAsync(
            token,
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
