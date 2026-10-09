namespace QrCar.Application.Features.PublicScan.Dtos;

public record ParkingReasonOption(string Code, string Label, bool RequiresMessage);

/// <summary>
/// What a scanner sees. The full phone number is never included; only a masked hint.
/// Call and WhatsApp go through dedicated redirect endpoints so the page itself stays clean.
/// </summary>
public record PublicCarResponse(
    string MaskedPhone,
    bool ShareLocation,
    double? LastLatitude,
    double? LastLongitude,
    DateTime? LastLocatedAtUtc,
    bool AcceptsRequests);

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
