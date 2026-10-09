using Microsoft.EntityFrameworkCore;
using QrCar.Application.Common.Exceptions;
using QrCar.Application.Common.Interfaces;
using QrCar.Application.Features.Users.Dtos;
using QrCar.Domain.Entities;

namespace QrCar.Application.Features.Users;

public class UserService : IUserService
{
    private readonly IAppDbContext _db;
    private readonly ICurrentUser _currentUser;
    private readonly IEncryptionService _encryption;
    private readonly IDateTimeProvider _clock;

    public UserService(
        IAppDbContext db,
        ICurrentUser currentUser,
        IEncryptionService encryption,
        IDateTimeProvider clock)
    {
        _db = db;
        _currentUser = currentUser;
        _encryption = encryption;
        _clock = clock;
    }

    public async Task<UserProfileResponse> GetMyProfileAsync(
        CancellationToken cancellationToken = default)
    {
        var userId = _currentUser.RequireUserId();
        var user = await LoadUserAsync(userId, cancellationToken);
        var carCount = await _db.Cars.CountAsync(c => c.UserId == userId, cancellationToken);

        return Map(user, carCount);
    }

    public async Task<UserProfileResponse> UpdateMyProfileAsync(
        UpdateProfileRequest request,
        CancellationToken cancellationToken = default)
    {
        var userId = _currentUser.RequireUserId();
        var user = await LoadUserAsync(userId, cancellationToken);

        var phone = request.PhoneNumber.Trim();

        user.FullName = request.FullName.Trim();
        user.PhoneNumberEncrypted = _encryption.Encrypt(phone);
        user.PhoneLast4 = phone[^4..];
        user.ShareLocation = request.ShareLocation;
        user.UpdatedAtUtc = _clock.UtcNow;

        await _db.SaveChangesAsync(cancellationToken);

        var carCount = await _db.Cars.CountAsync(c => c.UserId == userId, cancellationToken);
        return Map(user, carCount);
    }

    public async Task<UserProfileResponse> UpdateMyLocationAsync(
        UpdateLocationRequest request,
        CancellationToken cancellationToken = default)
    {
        var userId = _currentUser.RequireUserId();
        var user = await LoadUserAsync(userId, cancellationToken);

        if (!user.ShareLocation)
        {
            throw new ForbiddenException("Turn on location sharing before sending a position.");
        }

        user.LastLatitude = request.Latitude;
        user.LastLongitude = request.Longitude;
        user.LastLocatedAtUtc = _clock.UtcNow;
        user.UpdatedAtUtc = _clock.UtcNow;

        await _db.SaveChangesAsync(cancellationToken);

        var carCount = await _db.Cars.CountAsync(c => c.UserId == userId, cancellationToken);
        return Map(user, carCount);
    }

    private async Task<User> LoadUserAsync(Guid userId, CancellationToken cancellationToken)
    {
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == userId, cancellationToken);
        return user ?? throw NotFoundException.For("User", userId);
    }

    /// <summary>
    /// The owner is the only caller who ever receives their phone number in plaintext.
    /// </summary>
    private UserProfileResponse Map(User user, int carCount) => new(
        user.Id,
        user.FullName,
        user.Email,
        _encryption.Decrypt(user.PhoneNumberEncrypted),
        user.Role.ToString(),
        user.CreatedAtUtc,
        carCount,
        user.ShareLocation,
        user.LastLatitude,
        user.LastLongitude,
        user.LastLocatedAtUtc);
}
