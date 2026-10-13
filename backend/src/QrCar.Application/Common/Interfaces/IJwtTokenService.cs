using QrCar.Domain.Entities;

namespace QrCar.Application.Common.Interfaces;

public record AccessToken(string Token, DateTime ExpiresAtUtc);

public interface IJwtTokenService
{
    AccessToken CreateAccessToken(User user);

    string CreatePasswordResetToken(User user);

    bool TryReadPasswordResetToken(string token, out Guid userId, out string passwordStamp);

    bool MatchesPasswordStamp(string passwordHash, string stamp);
}
