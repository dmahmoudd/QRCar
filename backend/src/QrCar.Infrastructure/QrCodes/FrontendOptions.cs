namespace QrCar.Infrastructure.QrCodes;

public class FrontendOptions
{
    public const string SectionName = "Frontend";

    /// <summary>
    /// Public origin of the Angular app. This ends up printed on physical stickers, so changing
    /// it later invalidates every code already in the wild — set it deliberately.
    /// </summary>
    public string BaseUrl { get; set; } = "http://localhost:4200";

    /// <summary>Path of the public scan page. "{token}" is substituted at render time.</summary>
    public string ScanPathTemplate { get; set; } = "/c/{token}";

    /// <summary>
    /// Extra browser origins allowed to call the API, comma-separated.
    /// Production CORS is only BaseUrl plus this list — never every origin.
    /// </summary>
    public string AdditionalOrigins { get; set; } = string.Empty;
}
