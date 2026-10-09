namespace QrCar.Application.Features.Users.Dtos;

public record UserProfileResponse(
    Guid Id,
    string FullName,
    string Email,
    string PhoneNumber,
    string Role,
    DateTime CreatedAtUtc,
    int CarCount,
    bool ShareLocation,
    double? LastLatitude,
    double? LastLongitude,
    DateTime? LastLocatedAtUtc);

public record UpdateProfileRequest(string FullName, string PhoneNumber, bool ShareLocation);

public record UpdateLocationRequest(double Latitude, double Longitude);
