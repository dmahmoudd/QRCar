namespace QrCar.Application.Common;

/// <summary>
/// Shape of <c>Car.PublicToken</c>: 16 random bytes as unpadded base64url (22 characters).
/// Used to reject junk before a database lookup so malformed probes do not enumerate cars.
/// </summary>
public static class PublicTokenFormat
{
    public const int Length = 22;

    public static bool IsWellFormed(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return false;
        }

        var token = value.Trim();
        if (token.Length != Length)
        {
            return false;
        }

        foreach (var ch in token)
        {
            if (!char.IsAsciiLetterOrDigit(ch) && ch is not '-' and not '_')
            {
                return false;
            }
        }

        return true;
    }
}
