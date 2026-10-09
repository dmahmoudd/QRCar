using QrCar.Application.Common.Interfaces;
using QrCar.Infrastructure.Identity;

namespace QrCar.Api.Services;

/// <summary>
/// Reads the caller's identity from the validated JWT. Lives in the API layer because it is
/// the only place that knows about <see cref="HttpContext"/>.
/// </summary>
public class CurrentUser : ICurrentUser
{
    private readonly IHttpContextAccessor _httpContextAccessor;

    public CurrentUser(IHttpContextAccessor httpContextAccessor)
    {
        _httpContextAccessor = httpContextAccessor;
    }

    public Guid? UserId
    {
        get
        {
            var value = _httpContextAccessor.HttpContext?.User
                .FindFirst(JwtTokenService.SubjectClaim)?.Value;

            return Guid.TryParse(value, out var userId) ? userId : null;
        }
    }

    public bool IsAuthenticated =>
        _httpContextAccessor.HttpContext?.User.Identity?.IsAuthenticated ?? false;

    public Guid RequireUserId() =>
        UserId ?? throw new UnauthorizedAccessException("The request is not authenticated.");
}
