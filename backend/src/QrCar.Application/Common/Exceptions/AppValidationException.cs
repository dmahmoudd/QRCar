namespace QrCar.Application.Common.Exceptions;

/// <summary>Field-level validation failures, rendered as an RFC 7807 validation problem.</summary>
public class AppValidationException : Exception
{
    public AppValidationException(IDictionary<string, string[]> errors)
        : base("One or more validation errors occurred.")
    {
        Errors = errors;
    }

    public AppValidationException(string field, string error)
        : this(new Dictionary<string, string[]> { [field] = [error] })
    {
    }

    public IDictionary<string, string[]> Errors { get; }
}
