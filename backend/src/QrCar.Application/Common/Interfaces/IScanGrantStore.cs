namespace QrCar.Application.Common.Interfaces;

[Flags]
public enum ScanGrantOperations
{
    None = 0,
    Contact = 1,
    Request = 2,
}

/// <summary>
/// Short-lived grants issued only after official scanner validation.
/// A printed <c>/c/{token}</c> URL is not itself a grant. The grant stores the
/// public token and permitted operations — never a phone number or location.
/// This is not proof that the caller is the official website or a native app.
/// </summary>
public interface IScanGrantStore
{
    string Issue(string publicToken, ScanGrantOperations operations);

    bool TryGet(string scanId, ScanGrantOperations required, out string publicToken);
}
