using System.Security.Cryptography;
using System.Text;
using Microsoft.Extensions.Options;
using QrCar.Application.Common.Interfaces;

namespace QrCar.Infrastructure.Security;

public class HmacIpHasher : IIpHasher
{
    private readonly byte[] _key;

    public HmacIpHasher(IOptions<SecurityOptions> options)
    {
        var configured = options.Value.IpHashKey;

        if (string.IsNullOrWhiteSpace(configured))
        {
            throw new InvalidOperationException("Security:IpHashKey is not configured.");
        }

        _key = Convert.FromBase64String(configured);
    }

    public byte[]? Hash(string? ipAddress)
    {
        if (string.IsNullOrWhiteSpace(ipAddress))
        {
            return null;
        }

        return HMACSHA256.HashData(_key, Encoding.UTF8.GetBytes(ipAddress.Trim()));
    }
}
