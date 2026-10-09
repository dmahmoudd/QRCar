using QrCar.Application.Features.PublicScan.Dtos;

namespace QrCar.Application.Features.PublicScan;

public interface IPublicScanService
{
    IReadOnlyList<ParkingReasonOption> GetReasons();

    Task<PublicCarResponse> GetCarByTokenAsync(
        string publicToken,
        CancellationToken cancellationToken = default);

    /// <summary>Decrypts the owner's number for a one-time tel:/WhatsApp redirect. Not for JSON.</summary>
    Task<string> GetOwnerPhoneAsync(
        string publicToken,
        CancellationToken cancellationToken = default);

    Task<ParkingRequestCreatedResponse> CreateRequestAsync(
        string publicToken,
        CreateParkingRequestRequest request,
        string? requesterIp,
        string? userAgent,
        CancellationToken cancellationToken = default);

    Task<PublicRequestStatusResponse> GetRequestStatusAsync(
        string trackingRef,
        CancellationToken cancellationToken = default);
}
