namespace QrCar.Application.Common.Interfaces;

/// <summary>Authenticated symmetric encryption for personal data held at rest.</summary>
public interface IEncryptionService
{
    byte[] Encrypt(string plaintext);

    string Decrypt(byte[] ciphertext);
}
