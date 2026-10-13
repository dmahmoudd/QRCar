using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using QrCar.Application.Common.Interfaces;
using QrCar.Domain.Entities;

namespace QrCar.Infrastructure.Identity;

public class JwtTokenService : IJwtTokenService
{
    /// <summary>Claim names are kept short and unmapped; see JwtBearer setup in the API.</summary>
    public const string SubjectClaim = "sub";
    public const string NameClaim = "name";
    public const string EmailClaim = "email";
    public const string RoleClaim = "role";
    public const string PurposeClaim = "purpose";
    public const string StampClaim = "pwd";
    public const string PasswordResetPurpose = "pwd_reset";

    private static readonly JwtSecurityTokenHandler Handler = CreateHandler();

    private readonly JwtOptions _options;
    private readonly IDateTimeProvider _clock;
    private readonly SigningCredentials _signingCredentials;
    private readonly TokenValidationParameters _resetValidationParameters;

    public JwtTokenService(IOptions<JwtOptions> options, IDateTimeProvider clock)
    {
        _options = options.Value;
        _clock = clock;

        var keyBytes = Encoding.UTF8.GetBytes(_options.SigningKey);
        var signingKey = new SymmetricSecurityKey(keyBytes);
        _signingCredentials = new SigningCredentials(signingKey, SecurityAlgorithms.HmacSha256);
        _resetValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = _options.Issuer,
            ValidateAudience = true,
            ValidAudience = PasswordResetAudience(_options.Audience),
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = signingKey,
            ValidateLifetime = true,
            ClockSkew = TimeSpan.FromMinutes(1),
        };
    }

    public AccessToken CreateAccessToken(User user)
    {
        var issuedAt = _clock.UtcNow;
        var expiresAt = issuedAt.AddMinutes(_options.AccessTokenMinutes);

        var claims = new List<Claim>
        {
            new(SubjectClaim, user.Id.ToString()),
            new(EmailClaim, user.Email),
            new(NameClaim, user.FullName),
            new(RoleClaim, user.Role.ToString()),
            new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString("N")),
        };

        var token = new JwtSecurityToken(
            issuer: _options.Issuer,
            audience: _options.Audience,
            claims: claims,
            notBefore: issuedAt,
            expires: expiresAt,
            signingCredentials: _signingCredentials);

        return new AccessToken(Handler.WriteToken(token), expiresAt);
    }

    public string CreatePasswordResetToken(User user)
    {
        var issuedAt = _clock.UtcNow;
        var lifetime = _options.PasswordResetMinutes > 0 ? _options.PasswordResetMinutes : 30;
        var expiresAt = issuedAt.AddMinutes(lifetime);

        var claims = new List<Claim>
        {
            new(SubjectClaim, user.Id.ToString()),
            new(EmailClaim, user.Email),
            new(PurposeClaim, PasswordResetPurpose),
            new(StampClaim, PasswordStamp(user.PasswordHash)),
            new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString("N")),
        };

        var token = new JwtSecurityToken(
            issuer: _options.Issuer,
            audience: PasswordResetAudience(_options.Audience),
            claims: claims,
            notBefore: issuedAt,
            expires: expiresAt,
            signingCredentials: _signingCredentials);

        return Handler.WriteToken(token);
    }

    public bool TryReadPasswordResetToken(string token, out Guid userId, out string passwordStamp)
    {
        userId = Guid.Empty;
        passwordStamp = string.Empty;

        if (string.IsNullOrWhiteSpace(token))
        {
            return false;
        }

        try
        {
            var principal = Handler.ValidateToken(token, _resetValidationParameters, out _);
            if (principal.FindFirst(PurposeClaim)?.Value != PasswordResetPurpose)
            {
                return false;
            }

            if (!Guid.TryParse(principal.FindFirst(SubjectClaim)?.Value, out userId))
            {
                return false;
            }

            passwordStamp = principal.FindFirst(StampClaim)?.Value ?? string.Empty;
            return passwordStamp.Length > 0;
        }
        catch (Exception)
        {
            return false;
        }
    }

    public bool MatchesPasswordStamp(string passwordHash, string stamp) =>
        string.Equals(PasswordStamp(passwordHash), stamp, StringComparison.Ordinal);

    private static string PasswordStamp(string passwordHash)
    {
        var hash = SHA256.HashData(Encoding.UTF8.GetBytes(passwordHash));
        return Convert.ToHexString(hash)[..16];
    }

    private static string PasswordResetAudience(string audience) => audience + "-reset";

    private static JwtSecurityTokenHandler CreateHandler()
    {
        var handler = new JwtSecurityTokenHandler();
        handler.MapInboundClaims = false;
        return handler;
    }

    private static class JwtRegisteredClaimNames
    {
        public const string Jti = "jti";
    }
}
