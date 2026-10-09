using QrCar.Domain.Entities;

namespace QrCar.Application.Common.Interfaces;

public record AccessToken(string Token, DateTime ExpiresAtUtc);

public interface IJwtTokenService
{
    AccessToken CreateAccessToken(User user);
}
