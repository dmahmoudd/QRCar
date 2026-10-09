using QrCar.Application.Common;
using QrCar.Application.Features.Cars.Dtos;
using Xunit;

namespace QrCar.Application.Tests;

public class QrGenerationContractTests
{
    [Fact]
    public void Owner_QR_payload_still_uses_a_public_token_and_scan_url()
    {
        var names = typeof(QrCodeResponse).GetProperties().Select(property => property.Name).ToHashSet();

        Assert.Contains("PublicToken", names);
        Assert.Contains("ScanUrl", names);
        Assert.Contains("QrVersion", names);
        Assert.True(PublicTokenFormat.IsWellFormed("AbcdefghijkLMNOP12345-"));
    }
}
