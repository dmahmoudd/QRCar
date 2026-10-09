using FluentValidation;
using Microsoft.Extensions.DependencyInjection;
using QrCar.Application.Features.Auth;
using QrCar.Application.Features.Cars;
using QrCar.Application.Features.ParkingRequests;
using QrCar.Application.Features.PublicScan;
using QrCar.Application.Features.Users;

namespace QrCar.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        services.AddValidatorsFromAssemblyContaining(typeof(DependencyInjection));

        services.AddScoped<IAuthService, AuthService>();
        services.AddScoped<IUserService, UserService>();
        services.AddScoped<ICarService, CarService>();
        services.AddScoped<IPublicScanService, PublicScanService>();
        services.AddScoped<IParkingRequestService, ParkingRequestService>();

        return services;
    }
}
