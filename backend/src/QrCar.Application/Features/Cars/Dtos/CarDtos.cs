namespace QrCar.Application.Features.Cars.Dtos;

public record CarResponse(
    Guid Id,
    string PlateNumber,
    string CountryCode,
    string Make,
    string Model,
    string Color,
    string? Nickname,
    bool IsActive,
    int QrVersion,
    int ScanCount,
    DateTime? LastScannedAtUtc,
    DateTime CreatedAtUtc);

public record CreateCarRequest(string? Nickname);

public record UpdateCarRequest(string? Nickname, bool IsActive);

/// <summary>
/// Everything the owner needs to print a sticker. <see cref="ScanUrl"/> is the exact string
/// encoded in the QR image.
/// </summary>
public record QrCodeResponse(
    Guid CarId,
    string PublicToken,
    string ScanUrl,
    int QrVersion,
    int ScanCount,
    DateTime? LastScannedAtUtc);
