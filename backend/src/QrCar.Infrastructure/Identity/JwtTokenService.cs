using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
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

    private static readonly JwtSecurityTokenHandler Handler = new();

    private readonly JwtOptions _options;
    private readonly IDateTimeProvider _clock;
    private readonly SigningCredentials _signingCredentials;

    public JwtTokenService(IOptions<JwtOptions> options, IDateTimeProvider clock)
    {
        _options = options.Value;
        _clock = clock;

        var keyBytes = Encoding.UTF8.GetBytes(_options.SigningKey);
        _signingCredentials = new SigningCredentials(
            new SymmetricSecurityKey(keyBytes),
            SecurityAlgorithms.HmacSha256);
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

    private static class JwtRegisteredClaimNames
    {
        public const string Jti = "jti";
    }
}
