namespace QrCar.Application.Common.Interfaces;

public interface ISecureTokenGenerator
{
    /// <summary>
    /// 128 bits of cryptographic randomness as 22 base64url characters. Must be unguessable:
    /// anyone holding this string can reach the car's owner.
    /// </summary>
    string GeneratePublicToken();

    /// <summary>
    /// Shorter, human-readable reference handed to a scanner so they can poll their own request.
    /// Uses an alphabet without look-alike characters.
    /// </summary>
    string GenerateTrackingRef();
}
