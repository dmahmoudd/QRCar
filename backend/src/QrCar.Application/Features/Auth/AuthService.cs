using Microsoft.EntityFrameworkCore;
using QrCar.Application.Common;
using QrCar.Application.Common.Exceptions;
using QrCar.Application.Common.Interfaces;
using QrCar.Application.Features.Auth.Dtos;
using QrCar.Domain.Entities;
using QrCar.Domain.Enums;

namespace QrCar.Application.Features.Auth;

public class AuthService : IAuthService
{
    private readonly IAppDbContext _db;
    private readonly IPasswordHasher _passwordHasher;
    private readonly IJwtTokenService _tokenService;
    private readonly IEncryptionService _encryption;
    private readonly IDateTimeProvider _clock;

    public AuthService(
        IAppDbContext db,
        IPasswordHasher passwordHasher,
        IJwtTokenService tokenService,
        IEncryptionService encryption,
        IDateTimeProvider clock)
    {
        _db = db;
        _passwordHasher = passwordHasher;
        _tokenService = tokenService;
        _encryption = encryption;
        _clock = clock;
    }

    public async Task<AuthResponse> RegisterAsync(
        RegisterRequest request,
        CancellationToken cancellationToken = default)
    {
        var normalizedEmail = TextNormalizer.NormalizeEmail(request.Email);

        var emailTaken = await _db.Users
            .AnyAsync(u => u.NormalizedEmail == normalizedEmail, cancellationToken);

        if (emailTaken)
        {
            throw new ConflictException("An account with this email address already exists.");
        }

        var phone = request.PhoneNumber.Trim();

        var user = new User
        {
            FullName = request.FullName.Trim(),
            Email = request.Email.Trim(),
            NormalizedEmail = normalizedEmail,
            PasswordHash = _passwordHasher.Hash(request.Password),
            PhoneNumberEncrypted = _encryption.Encrypt(phone),
            PhoneLast4 = phone[^4..],
            Role = UserRole.User,
            IsActive = true,
            CreatedAtUtc = _clock.UtcNow,
        };

        _db.Users.Add(user);
        await _db.SaveChangesAsync(cancellationToken);

        return BuildAuthResponse(user);
    }

    public async Task<AuthResponse> LoginAsync(
        LoginRequest request,
        CancellationToken cancellationToken = default)
    {
        var normalizedEmail = TextNormalizer.NormalizeEmail(request.Email);

        var user = await _db.Users
            .FirstOrDefaultAsync(u => u.NormalizedEmail == normalizedEmail, cancellationToken);

        if (user is null)
        {
            // Burn the same amount of time a real verification would, so response latency
            // does not reveal whether the address is registered.
            _passwordHasher.Hash(request.Password);
            throw new InvalidCredentialsException();
        }

        if (!_passwordHasher.Verify(request.Password, user.PasswordHash))
        {
            throw new InvalidCredentialsException();
        }

        if (!user.IsActive)
        {
            throw new ForbiddenException("This account has been deactivated.");
        }

        return BuildAuthResponse(user);
    }

    private AuthResponse BuildAuthResponse(User user)
    {
        var token = _tokenService.CreateAccessToken(user);

        return new AuthResponse(
            token.Token,
            "Bearer",
            token.ExpiresAtUtc,
            new AuthUserSummary(user.Id, user.FullName, user.Email, user.Role.ToString()));
    }
}
