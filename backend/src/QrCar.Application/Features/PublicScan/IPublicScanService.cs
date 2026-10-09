using QrCar.Application.Features.PublicScan.Dtos;

namespace QrCar.Application.Features.PublicScan;

public interface IPublicScanService
{
    IReadOnlyList<ParkingReasonOption> GetReasons();

    /// <summary>
    /// Public browser lookup for a printed sticker URL. Never looks up the car and never
    /// returns owner or vehicle details.
    /// </summary>
    PublicBrowserAccessResponse GetBrowserAccess();

    /// <summary>
    /// Official scanner validation. Issues a short-lived scan grant used for Call / WhatsApp.
    /// </summary>
    Task<OfficialScanResponse> CreateOfficialScanAsync(
        string publicToken,
        CancellationToken cancellationToken = default);

    /// <summary>Decrypts the owner's number for a one-time tel:/WhatsApp redirect. Not for JSON.</summary>
    Task<string> GetOwnerPhoneForScanAsync(
        string scanId,
        CancellationToken cancellationToken = default);

    Task<ParkingRequestCreatedResponse> CreateRequestForScanAsync(
        string scanId,
        CreateParkingRequestRequest request,
        string? requesterIp,
        string? userAgent,
        CancellationToken cancellationToken = default);

    Task<PublicRequestStatusResponse> GetRequestStatusAsync(
        string trackingRef,
        CancellationToken cancellationToken = default);
}
