using System.Buffers.Text;
using System.Security.Cryptography;
using QrCar.Application.Common.Interfaces;

namespace QrCar.Infrastructure.Security;

public class SecureTokenGenerator : ISecureTokenGenerator
{
    private const int PublicTokenBytes = 16;
    private const int TrackingRefLength = 10;

    /// <summary>
    /// Crockford-style alphabet with I, O, 0 and 1 removed, so a reference can be read aloud
    /// or typed from a screenshot without ambiguity.
    /// </summary>
    private static readonly char[] TrackingAlphabet =
        "ABCDEFGHJKLMNPQRSTUVWXYZ23456789".ToCharArray();

    /// <summary>16 random bytes encode to 22 base64url characters with no padding.</summary>
    public string GeneratePublicToken() =>
        Base64Url.EncodeToString(RandomNumberGenerator.GetBytes(PublicTokenBytes));

    public string GenerateTrackingRef() =>
        new(RandomNumberGenerator.GetItems<char>(TrackingAlphabet, TrackingRefLength));
}
