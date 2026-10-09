using System.Security.Cryptography;
using System.Text;
using Microsoft.Extensions.Options;
using QrCar.Application.Common.Interfaces;

namespace QrCar.Infrastructure.Security;

/// <summary>
/// AES-256-GCM. Authenticated encryption matters here: it guarantees a stored phone number
/// cannot be silently tampered with, not just that it cannot be read.
/// Stored layout: nonce (12 bytes) || tag (16 bytes) || ciphertext.
/// </summary>
public class AesGcmEncryptionService : IEncryptionService
{
    private const int NonceSize = 12;
    private const int TagSize = 16;
    private const int KeySize = 32;

    private readonly byte[] _key;

    public AesGcmEncryptionService(IOptions<SecurityOptions> options)
    {
        _key = DecodeKey(options.Value.EncryptionKey);
    }

    public byte[] Encrypt(string plaintext)
    {
        var plainBytes = Encoding.UTF8.GetBytes(plaintext);
        var nonce = RandomNumberGenerator.GetBytes(NonceSize);
        var ciphertext = new byte[plainBytes.Length];
        var tag = new byte[TagSize];

        using var aes = new AesGcm(_key, TagSize);
        aes.Encrypt(nonce, plainBytes, ciphertext, tag);

        var payload = new byte[NonceSize + TagSize + ciphertext.Length];
        nonce.CopyTo(payload, 0);
        tag.CopyTo(payload, NonceSize);
        ciphertext.CopyTo(payload, NonceSize + TagSize);

        return payload;
    }

    public string Decrypt(byte[] ciphertext)
    {
        if (ciphertext.Length < NonceSize + TagSize)
        {
            throw new CryptographicException("Encrypted payload is malformed.");
        }

        var nonce = ciphertext.AsSpan(0, NonceSize);
        var tag = ciphertext.AsSpan(NonceSize, TagSize);
        var body = ciphertext.AsSpan(NonceSize + TagSize);
        var plainBytes = new byte[body.Length];

        using var aes = new AesGcm(_key, TagSize);
        aes.Decrypt(nonce, body, tag, plainBytes);

        return Encoding.UTF8.GetString(plainBytes);
    }

    private static byte[] DecodeKey(string base64Key)
    {
        if (string.IsNullOrWhiteSpace(base64Key))
        {
            throw new InvalidOperationException(
                "Security:EncryptionKey is not configured. Generate one with: " +
                "[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Max 256 }))");
        }

        byte[] key;

        try
        {
            key = Convert.FromBase64String(base64Key);
        }
        catch (FormatException)
        {
            throw new InvalidOperationException("Security:EncryptionKey must be valid base64.");
        }

        if (key.Length != KeySize)
        {
            throw new InvalidOperationException(
                $"Security:EncryptionKey must decode to exactly {KeySize} bytes, but was {key.Length}.");
        }

        return key;
    }
}
