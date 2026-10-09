namespace QrCar.Application.Common.Exceptions;

public class NotFoundException : Exception
{
    public NotFoundException(string message) : base(message)
    {
    }

    public static NotFoundException For(string entity, object key) =>
        new($"{entity} '{key}' was not found.");
}
