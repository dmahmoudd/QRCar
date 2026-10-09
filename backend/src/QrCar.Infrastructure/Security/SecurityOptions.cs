namespace QrCar.Infrastructure.Security;

public class SecurityOptions
{
    public const string SectionName = "Security";

    /// <summary>Base64 encoded 32-byte AES-256 key used to encrypt stored phone numbers.</summary>
    public string EncryptionKey { get; set; } = string.Empty;

    /// <summary>Base64 encoded key for the HMAC applied to requester IP addresses.</summary>
    public string IpHashKey { get; set; } = string.Empty;
}
