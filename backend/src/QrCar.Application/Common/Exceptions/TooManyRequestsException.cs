namespace QrCar.Application.Common.Exceptions;

public class TooManyRequestsException : Exception
{
    public TooManyRequestsException(string message, TimeSpan? retryAfter = null) : base(message)
    {
        RetryAfter = retryAfter;
    }

    public TimeSpan? RetryAfter { get; }
}
