namespace QrCar.Application.Common.Interfaces;

/// <summary>
/// Produces a keyed hash of a requester IP. A plain hash would be reversible by brute force
/// across the whole IPv4 space, so the key is what makes this non-identifying.
/// </summary>
public interface IIpHasher
{
    byte[]? Hash(string? ipAddress);
}
