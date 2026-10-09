using QrCar.Application.Common;
using Xunit;

namespace QrCar.Application.Tests;

public class PublicTokenFormatTests
{
    private const string ValidToken = "AbcdefghijkLMNOP12345-";

    [Fact]
    public void Accepts_existing_base64url_token()
    {
        Assert.True(PublicTokenFormat.IsWellFormed(ValidToken));
        Assert.True(PublicTokenFormat.IsWellFormed($"  {ValidToken}  "));
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData("short")]
    [InlineData("AbcdefghijkLMNOP12345")]
    [InlineData("AbcdefghijkLMNOP12345--")]
    [InlineData("AbcdefghijkLMNOP12345+")]
    [InlineData("AbcdefghijkLMNOP12345/")]
    [InlineData("not a token value!!!!")]
    [InlineData("javascript:alert(1)")]
    public void Rejects_malformed_tokens(string? value)
    {
        Assert.False(PublicTokenFormat.IsWellFormed(value));
    }
}
