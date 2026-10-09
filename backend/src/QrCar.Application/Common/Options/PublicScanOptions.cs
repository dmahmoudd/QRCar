namespace QrCar.Application.Common.Options;

/// <summary>Abuse-control knobs for the anonymous scan surface.</summary>
public class PublicScanOptions
{
    public const string SectionName = "PublicScan";

    /// <summary>How long the same requester must wait before contacting the same car again.</summary>
    public int CooldownMinutes { get; set; } = 3;

    /// <summary>Ceiling on requests a single car can receive per rolling 24 hours.</summary>
    public int MaxRequestsPerCarPerDay { get; set; } = 10;

    /// <summary>After this long an unanswered request is no longer actionable.</summary>
    public int RequestLifetimeHours { get; set; } = 12;

    /// <summary>Maximum length of the free-text note a scanner may attach.</summary>
    public int MaxMessageLength { get; set; } = 250;
}
