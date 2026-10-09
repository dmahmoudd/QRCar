namespace QrCar.Application.Common;

public static class PhoneMasker
{
    /// <summary>
    /// Keeps the country prefix and last four digits. The middle is what a stranger would
    /// use to ring the owner, so it never leaves the server on the public lookup.
    /// </summary>
    public static string Mask(string e164)
    {
        if (string.IsNullOrWhiteSpace(e164) || e164.Length < 6)
        {
            return "••••";
        }

        var prefixLength = e164.StartsWith('+') ? Math.Min(3, e164.Length - 4) : 2;
        return $"{e164[..prefixLength]} ••• ••• {e164[^4..]}";
    }
}
