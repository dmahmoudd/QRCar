using System.Net;
using System.Net.NetworkInformation;
using System.Net.Sockets;

namespace QrCar.Infrastructure.QrCodes;

/// <summary>
/// A phone that scans a QR cannot open "localhost" — that is the phone itself.
/// This picks the first private IPv4 on this machine so stickers work on the same Wi-Fi.
/// </summary>
public static class LanAddress
{
    public static string? FirstPrivateIpv4()
    {
        foreach (var network in NetworkInterface.GetAllNetworkInterfaces())
        {
            if (network.OperationalStatus != OperationalStatus.Up)
            {
                continue;
            }

            if (network.NetworkInterfaceType is NetworkInterfaceType.Loopback)
            {
                continue;
            }

            foreach (var address in network.GetIPProperties().UnicastAddresses)
            {
                if (address.Address.AddressFamily != AddressFamily.InterNetwork)
                {
                    continue;
                }

                if (IsPrivate(address.Address))
                {
                    return address.Address.ToString();
                }
            }
        }

        return null;
    }

    public static string ReplaceLocalhostWithLan(string origin)
    {
        if (!origin.Contains("localhost", StringComparison.OrdinalIgnoreCase))
        {
            return origin;
        }

        var lan = FirstPrivateIpv4();
        return lan is null
            ? origin
            : origin.Replace("localhost", lan, StringComparison.OrdinalIgnoreCase);
    }

    private static bool IsPrivate(IPAddress address)
    {
        var bytes = address.GetAddressBytes();
        return bytes[0] == 10
               || (bytes[0] == 172 && bytes[1] is >= 16 and <= 31)
               || (bytes[0] == 192 && bytes[1] == 168);
    }
}
