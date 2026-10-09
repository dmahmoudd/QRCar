namespace QrCar.Infrastructure.Identity;

public class JwtOptions
{
    public const string SectionName = "Jwt";

    public string Issuer { get; set; } = "QrCar.Api";

    public string Audience { get; set; } = "QrCar.Client";

    /// <summary>
    /// HMAC signing key. Must be at least 32 bytes; keep it out of source control and
    /// supply it through user-secrets locally or the environment in production.
    /// </summary>
    public string SigningKey { get; set; } = string.Empty;

    public int AccessTokenMinutes { get; set; } = 60;
}
