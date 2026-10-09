using QRCoder;
using QrCar.Application.Common.Interfaces;

namespace QrCar.Infrastructure.QrCodes;

public class QrCodeService : IQrCodeService
{
    /// <summary>
    /// Highest error correction level. These codes get printed and stuck to a car, where they
    /// collect rain, dust and scratches, so tolerating ~30% damage is worth the extra density.
    /// </summary>
    private const QRCodeGenerator.ECCLevel ErrorCorrection = QRCodeGenerator.ECCLevel.H;

    private static readonly QRCodeGenerator Generator = new();

    public byte[] GeneratePng(string content, int targetSizePixels)
    {
        using var data = CreateData(content);
        return new PngByteQRCode(data).GetGraphic(PixelsPerModule(data, targetSizePixels));
    }

    public string GenerateSvg(string content, int targetSizePixels)
    {
        using var data = CreateData(content);
        return new SvgQRCode(data).GetGraphic(PixelsPerModule(data, targetSizePixels));
    }

    private static QRCodeData CreateData(string content) =>
        Generator.CreateQrCode(content, ErrorCorrection);

    /// <summary>
    /// QR images can only be sized in whole modules, so the requested pixel width is converted
    /// into the nearest module scale that does not exceed it.
    /// </summary>
    private static int PixelsPerModule(QRCodeData data, int targetSizePixels)
    {
        var moduleCount = data.ModuleMatrix.Count;

        if (moduleCount <= 0)
        {
            return 1;
        }

        return Math.Max(1, targetSizePixels / moduleCount);
    }
}
