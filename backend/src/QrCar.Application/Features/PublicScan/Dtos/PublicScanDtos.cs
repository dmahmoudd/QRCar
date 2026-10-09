namespace QrCar.Application.Features.PublicScan.Dtos;

public record ParkingReasonOption(string Code, string Label, bool RequiresMessage);

/// <summary>
/// Returned by GET /public/cars/{token}. Contains no vehicle, phone, or location fields.
/// Query flags such as fromApp are ignored by the API and cannot change this.
/// </summary>
public record PublicBrowserAccessResponse(bool RequiresOfficialApp);

/// <summary>
/// What the official scanner sees after POST /public/scans. The full phone number is never
/// included; only a masked hint. Call and WhatsApp use the short-lived <see cref="ScanId"/>.
/// </summary>
public record OfficialScanResponse(
    string ScanId,
    string MaskedPhone,
    bool ShareLocation,
    double? LastLatitude,
    double? LastLongitude,
    DateTime? LastLocatedAtUtc,
    bool AcceptsRequests);

public record CreateOfficialScanRequest(string Token);

public record CreateParkingRequestRequest(string Reason, string? Message);

public record ParkingRequestCreatedResponse(
    string TrackingRef,
    DateTime CreatedAtUtc,
    DateTime ExpiresAtUtc);

/// <summary>What the scanner is allowed to learn after submitting: progress, and nothing else.</summary>
public record PublicRequestStatusResponse(
    string TrackingRef,
    string Status,
    string? ResponseType,
    string? ResponseLabel,
    DateTime CreatedAtUtc,
    DateTime? RespondedAtUtc);
