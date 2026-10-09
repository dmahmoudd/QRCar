using Microsoft.Extensions.Options;
using QrCar.Application.Common.Interfaces;

namespace QrCar.Infrastructure.QrCodes;

public class PublicUrlBuilder : IPublicUrlBuilder
{
    private readonly FrontendOptions _options;

    public PublicUrlBuilder(IOptions<FrontendOptions> options)
    {
        _options = options.Value;
    }

    public string BuildScanUrl(string publicToken)
    {
        var origin = LanAddress.ReplaceLocalhostWithLan(_options.BaseUrl.TrimEnd('/'));
        var path = _options.ScanPathTemplate.Replace("{token}", publicToken);

        if (!path.StartsWith('/'))
        {
            path = '/' + path;
        }

        return origin + path;
    }
}
