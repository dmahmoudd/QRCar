namespace QrCar.Application.Common.Interfaces;

public enum QrImageFormat
{
    Png = 1,
    Svg = 2,
}

public record QrImageResult(byte[] Content, string ContentType, string FileName);

/// <summary>Renders QR images. Knows nothing about cars or tokens.</summary>
public interface IQrCodeService
{
    /// <summary>
    /// Renders <paramref name="content"/> as a QR code roughly <paramref name="targetSizePixels"/> wide.
    /// The exact size is quantised to whole modules, so it may differ by a few pixels.
    /// </summary>
    byte[] GeneratePng(string content, int targetSizePixels);

    string GenerateSvg(string content, int targetSizePixels);
}
