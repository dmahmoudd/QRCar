using QrCar.Application.Common;
using QrCar.Application.Features.PublicScan.Dtos;
using Xunit;

namespace QrCar.Application.Tests;

public class PublicAccessContractTests
{
    [Fact]
    public void Browser_access_response_has_no_vehicle_or_contact_fields()
    {
        var names = typeof(PublicBrowserAccessResponse)
            .GetProperties()
            .Select(property => property.Name)
            .OrderBy(name => name)
            .ToArray();

        Assert.Equal(new[] { "RequiresOfficialApp" }, names);
    }

    [Fact]
    public void GetBrowserAccess_never_depends_on_the_printed_token()
    {
        Assert.True(new PublicBrowserAccessResponse(true).RequiresOfficialApp);
    }

    [Fact]
    public void Official_scan_response_still_carries_contact_fields_after_validation()
    {
        var names = typeof(OfficialScanResponse).GetProperties().Select(p => p.Name).ToHashSet();

        Assert.Contains("ScanId", names);
        Assert.Contains("MaskedPhone", names);
        Assert.Contains("ShareLocation", names);
        Assert.Contains("LastLatitude", names);
        Assert.Contains("LastLongitude", names);
        Assert.Contains("AcceptsRequests", names);
    }

    [Fact]
    public void Printed_QR_tokens_keep_the_existing_22_character_shape()
    {
        Assert.Equal(22, PublicTokenFormat.Length);
        Assert.True(PublicTokenFormat.IsWellFormed("AbcdefghijkLMNOP12345-"));
    }
}
