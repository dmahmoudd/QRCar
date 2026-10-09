using Microsoft.AspNetCore.Authorization;
using QrCar.Api.Controllers;
using Xunit;

namespace QrCar.Api.Tests;

public class OwnerApiProtectionTests
{
    [Fact]
    public void Cars_controller_stays_behind_JWT()
    {
        var authorize = typeof(CarsController)
            .GetCustomAttributes(typeof(AuthorizeAttribute), inherit: true);

        Assert.NotEmpty(authorize);
    }

    [Fact]
    public void Public_controller_stays_anonymous()
    {
        var allowAnonymous = typeof(PublicController)
            .GetCustomAttributes(typeof(AllowAnonymousAttribute), inherit: true);

        Assert.NotEmpty(allowAnonymous);
    }
}
