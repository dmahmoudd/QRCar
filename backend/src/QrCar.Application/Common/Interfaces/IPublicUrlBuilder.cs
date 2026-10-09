namespace QrCar.Application.Common.Interfaces;

public interface IPublicUrlBuilder
{
    /// <summary>The URL encoded into the printed QR code, e.g. https://app.example.com/c/{token}.</summary>
    string BuildScanUrl(string publicToken);
}
