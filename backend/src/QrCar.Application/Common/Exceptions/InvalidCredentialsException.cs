namespace QrCar.Application.Common.Exceptions;

/// <summary>
/// Deliberately does not say whether the email or the password was wrong,
/// so the endpoint cannot be used to enumerate registered accounts.
/// </summary>
public class InvalidCredentialsException : Exception
{
    public InvalidCredentialsException() : base("Email or password is incorrect.")
    {
    }
}
