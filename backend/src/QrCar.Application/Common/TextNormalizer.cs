namespace QrCar.Application.Common;

internal static class TextNormalizer
{
    public static string NormalizeEmail(string email) => email.Trim().ToUpperInvariant();

    /// <summary>Strips separators and casing so "ab-12 34" and "AB1234" are treated as one plate.</summary>
    public static string NormalizePlate(string plate) =>
        new(plate.Where(char.IsLetterOrDigit).Select(char.ToUpperInvariant).ToArray());
}
