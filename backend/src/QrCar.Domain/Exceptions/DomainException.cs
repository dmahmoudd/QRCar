namespace QrCar.Domain.Exceptions;

/// <summary>
/// Thrown when an operation would violate a business rule owned by the domain model.
/// Surfaces as HTTP 409 Conflict.
/// </summary>
public class DomainException : Exception
{
    public DomainException(string message) : base(message)
    {
    }
}
