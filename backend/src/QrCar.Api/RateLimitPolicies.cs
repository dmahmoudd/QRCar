namespace QrCar.Api;

public static class RateLimitPolicies
{
    /// <summary>Slows down credential stuffing against register and login.</summary>
    public const string Auth = "auth";

    /// <summary>Applies to anonymous reads of the scan surface.</summary>
    public const string PublicScan = "public-scan";

    /// <summary>
    /// Applies to creating parking requests. This is the coarse network-level guard; the
    /// per-car and per-requester cooldowns live in the application layer.
    /// </summary>
    public const string PublicRequest = "public-request";
}
