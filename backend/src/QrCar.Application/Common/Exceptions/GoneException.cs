namespace QrCar.Application.Common.Exceptions;

/// <summary>
/// The resource existed but has been deliberately retired, e.g. a QR token that was rotated.
/// Surfaces as HTTP 410 so a scanner sees "this sticker is no longer valid" rather than a generic 404.
/// </summary>
public class GoneException : Exception
{
    public GoneException(string message) : base(message)
    {
    }
}
