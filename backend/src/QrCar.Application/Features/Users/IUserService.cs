using QrCar.Application.Features.Users.Dtos;

namespace QrCar.Application.Features.Users;

public interface IUserService
{
    Task<UserProfileResponse> GetMyProfileAsync(CancellationToken cancellationToken = default);

    Task<UserProfileResponse> UpdateMyProfileAsync(
        UpdateProfileRequest request,
        CancellationToken cancellationToken = default);

    Task<UserProfileResponse> UpdateMyLocationAsync(
        UpdateLocationRequest request,
        CancellationToken cancellationToken = default);
}
