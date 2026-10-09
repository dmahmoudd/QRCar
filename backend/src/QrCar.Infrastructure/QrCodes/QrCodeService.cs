using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;
using System.Runtime.Versioning;
using QRCoder;
using QrCar.Application.Common.Interfaces;

namespace QrCar.Infrastructure.QrCodes;

[SupportedOSPlatform("windows")]
public class QrCodeService : IQrCodeService
{
    /// <summary>
    /// Highest error correction. Stickers get rained on and the centre logo covers some modules.
    /// </summary>
    private const QRCodeGenerator.ECCLevel ErrorCorrection = QRCodeGenerator.ECCLevel.H;

    private const string TemplateResourceName =
        "QrCar.Infrastructure.QrCodes.Assets.sticker-template.png";

    private static readonly Color DarkModule = Color.FromArgb(255, 11, 29, 54);
    private static readonly Color BrandOrange = Color.FromArgb(255, 245, 166, 35);

    private static readonly QRCodeGenerator Generator = new();
    private static readonly Lazy<byte[]> TemplateBytes = new(LoadTemplate);

    public byte[] GeneratePng(string content, int targetSizePixels)
    {
        using var sticker = ComposeSticker(content, targetSizePixels);
        using var output = new MemoryStream();
        sticker.Save(output, ImageFormat.Png);
        return output.ToArray();
    }

    public string GenerateSvg(string content, int targetSizePixels)
    {
        var png = GeneratePng(content, targetSizePixels);
        var payload = Convert.ToBase64String(png);

        return
            $"""
            <svg xmlns="http://www.w3.org/2000/svg" width="{targetSizePixels}" height="{targetSizePixels}" viewBox="0 0 {targetSizePixels} {targetSizePixels}">
              <image href="data:image/png;base64,{payload}" width="{targetSizePixels}" height="{targetSizePixels}"/>
            </svg>
            """;
    }

    private static Bitmap ComposeSticker(string content, int targetSizePixels)
    {
        using var templateStream = new MemoryStream(TemplateBytes.Value);
        using var template = new Bitmap(templateStream);
        var plate = FindPlateBounds(template);
        var qrSize = Math.Max(32, Math.Min(plate.Width, plate.Height));

        using var qr = RenderQr(content, qrSize);
        DrawCallBadge(qr);

        var dest = new Rectangle(
            plate.X + (plate.Width - qrSize) / 2,
            plate.Y + (plate.Height - qrSize) / 2,
            qrSize,
            qrSize);

        using var canvas = new Bitmap(template.Width, template.Height, PixelFormat.Format32bppArgb);
        using (var graphics = Graphics.FromImage(canvas))
        {
            graphics.CompositingQuality = CompositingQuality.HighQuality;
            graphics.InterpolationMode = InterpolationMode.HighQualityBicubic;
            graphics.PixelOffsetMode = PixelOffsetMode.HighQuality;
            graphics.SmoothingMode = SmoothingMode.AntiAlias;
            graphics.DrawImage(template, 0, 0, template.Width, template.Height);
            graphics.DrawImage(qr, dest);
        }

        if (canvas.Width == targetSizePixels && canvas.Height == targetSizePixels)
        {
            return (Bitmap)canvas.Clone();
        }

        var sized = new Bitmap(targetSizePixels, targetSizePixels, PixelFormat.Format32bppArgb);
        using (var graphics = Graphics.FromImage(sized))
        {
            graphics.CompositingQuality = CompositingQuality.HighQuality;
            graphics.InterpolationMode = InterpolationMode.HighQualityBicubic;
            graphics.PixelOffsetMode = PixelOffsetMode.HighQuality;
            graphics.SmoothingMode = SmoothingMode.AntiAlias;
            graphics.DrawImage(canvas, 0, 0, targetSizePixels, targetSizePixels);
        }

        return sized;
    }

    private static Bitmap RenderQr(string content, int targetSizePixels)
    {
        using var data = Generator.CreateQrCode(content, ErrorCorrection);
        var pixelsPerModule = Math.Max(1, targetSizePixels / data.ModuleMatrix.Count);
        var png = new PngByteQRCode(data).GetGraphic(
            pixelsPerModule,
            [DarkModule.R, DarkModule.G, DarkModule.B, DarkModule.A],
            [255, 255, 255, 255],
            drawQuietZones: false);

        using var stream = new MemoryStream(png);
        using var loaded = new Bitmap(stream);
        var sized = new Bitmap(targetSizePixels, targetSizePixels, PixelFormat.Format32bppArgb);
        using var graphics = Graphics.FromImage(sized);
        graphics.InterpolationMode = InterpolationMode.HighQualityBicubic;
        graphics.PixelOffsetMode = PixelOffsetMode.HighQuality;
        graphics.DrawImage(loaded, 0, 0, targetSizePixels, targetSizePixels);
        return sized;
    }

    /// <summary>
    /// Flood-fills the white number-plate from a seed on the car, then insets so the
    /// QR sits inside the rounded corners the way the branded mockup does.
    /// </summary>
    private static Rectangle FindPlateBounds(Bitmap sticker)
    {
        var seedX = sticker.Width / 2;
        var seedY = (int)(sticker.Height * 0.42f);
        var seed = sticker.GetPixel(seedX, seedY);
        var visited = new bool[sticker.Width * sticker.Height];
        var queue = new Queue<(int X, int Y)>();

        Enqueue(seedX, seedY);

        var minX = seedX;
        var maxX = seedX;
        var minY = seedY;
        var maxY = seedY;
        var count = 0;

        while (queue.Count > 0)
        {
            var (x, y) = queue.Dequeue();
            count++;
            minX = Math.Min(minX, x);
            maxX = Math.Max(maxX, x);
            minY = Math.Min(minY, y);
            maxY = Math.Max(maxY, y);

            Try(x - 1, y);
            Try(x + 1, y);
            Try(x, y - 1);
            Try(x, y + 1);
        }

        var bounds = Rectangle.FromLTRB(minX, minY, maxX + 1, maxY + 1);
        var imageArea = sticker.Width * sticker.Height;
        var looksLikePlate = count >= 2_000 && count <= imageArea / 4;

        if (!looksLikePlate)
        {
            bounds = new Rectangle(
                (int)(sticker.Width * 0.355),
                (int)(sticker.Height * 0.335),
                (int)(sticker.Width * 0.29),
                (int)(sticker.Height * 0.305));
        }

        var inset = Math.Max(3, (int)(Math.Min(bounds.Width, bounds.Height) * 0.03));
        bounds.Inflate(-inset, -inset);
        return bounds;

        void Try(int x, int y)
        {
            if (x < 0 || y < 0 || x >= sticker.Width || y >= sticker.Height)
            {
                return;
            }

            var index = y * sticker.Width + x;
            if (visited[index])
            {
                return;
            }

            if (!IsPlatePixel(sticker.GetPixel(x, y), seed))
            {
                return;
            }

            Enqueue(x, y);
        }

        void Enqueue(int x, int y)
        {
            visited[y * sticker.Width + x] = true;
            queue.Enqueue((x, y));
        }
    }

    private static bool IsPlatePixel(Color pixel, Color seed) =>
        pixel.A > 200
        && Math.Abs(pixel.R - seed.R) <= 10
        && Math.Abs(pixel.G - seed.G) <= 10
        && Math.Abs(pixel.B - seed.B) <= 10;

    /// <summary>
    /// White rounded square plus the orange call icon from the brand mockup.
    /// Sized for ECC H so scanners still read the code.
    /// </summary>
    private static void DrawCallBadge(Bitmap qr)
    {
        var badge = Math.Max(24, (int)(qr.Width * 0.22));
        var x = (qr.Width - badge) / 2f;
        var y = (qr.Height - badge) / 2f;
        var radius = Math.Max(4f, badge / 6f);

        using var graphics = Graphics.FromImage(qr);
        graphics.SmoothingMode = SmoothingMode.AntiAlias;
        graphics.PixelOffsetMode = PixelOffsetMode.HighQuality;

        using (var badgePath = RoundedRect(x, y, badge, badge, radius))
        using (var fill = new SolidBrush(Color.White))
        {
            graphics.FillPath(fill, badgePath);
        }

        DrawPhoneIcon(graphics, x + badge / 2f, y + badge / 2f, badge);
    }

    private static void DrawPhoneIcon(Graphics graphics, float cx, float cy, float badgeSize)
    {
        var unit = badgeSize / 24f;

        using var orange = new SolidBrush(BrandOrange);
        using var bar = new Pen(BrandOrange, unit * 2.15f)
        {
            StartCap = LineCap.Round,
            EndCap = LineCap.Round,
        };
        using var wave = new Pen(BrandOrange, Math.Max(1.6f, unit * 1.05f))
        {
            StartCap = LineCap.Round,
            EndCap = LineCap.Round,
        };

        graphics.TranslateTransform(cx - 0.4f * unit, cy + 0.6f * unit);
        graphics.RotateTransform(-42);
        graphics.FillEllipse(orange, -8.8f * unit, -3.3f * unit, 6f * unit, 7.1f * unit);
        graphics.FillEllipse(orange, 2.8f * unit, -3.3f * unit, 6f * unit, 7.1f * unit);
        graphics.DrawLine(bar, -3.4f * unit, 0.2f * unit, 3.4f * unit, 0.2f * unit);
        graphics.ResetTransform();

        graphics.TranslateTransform(cx + 2.6f * unit, cy - 3.6f * unit);
        graphics.DrawArc(wave, 0.4f * unit, -3.6f * unit, 5.8f * unit, 5.8f * unit, -72, 64);
        graphics.DrawArc(wave, 2f * unit, -5.8f * unit, 8.6f * unit, 8.6f * unit, -72, 64);
        graphics.ResetTransform();
    }

    private static GraphicsPath RoundedRect(float x, float y, float width, float height, float radius)
    {
        var path = new GraphicsPath();
        var diameter = radius * 2f;
        path.AddArc(x, y, diameter, diameter, 180, 90);
        path.AddArc(x + width - diameter, y, diameter, diameter, 270, 90);
        path.AddArc(x + width - diameter, y + height - diameter, diameter, diameter, 0, 90);
        path.AddArc(x, y + height - diameter, diameter, diameter, 90, 90);
        path.CloseFigure();
        return path;
    }

    private static byte[] LoadTemplate()
    {
        var assembly = typeof(QrCodeService).Assembly;
        using var stream = assembly.GetManifestResourceStream(TemplateResourceName)
            ?? throw new InvalidOperationException(
                $"Embedded sticker template '{TemplateResourceName}' was not found.");

        using var copy = new MemoryStream();
        stream.CopyTo(copy);
        return copy.ToArray();
    }
}
