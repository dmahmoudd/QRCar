using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using QrCar.Application.Common.Interfaces;
using QrCar.Application.Common.Options;
using QrCar.Infrastructure.Common;
using QrCar.Infrastructure.Identity;
using QrCar.Infrastructure.Persistence;
using QrCar.Infrastructure.Persistence.Interceptors;
using QrCar.Infrastructure.QrCodes;
using QrCar.Infrastructure.Security;

namespace QrCar.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        services.AddOptions<JwtOptions>()
            .Bind(configuration.GetSection(JwtOptions.SectionName))
            .Validate(
                o => !string.IsNullOrWhiteSpace(o.SigningKey) && o.SigningKey.Length >= 32,
                "Jwt:SigningKey is required and must be at least 32 characters.")
            .Validate(
                o => o.AccessTokenMinutes > 0,
                "Jwt:AccessTokenMinutes must be greater than zero.")
            .ValidateOnStart();

        services.AddOptions<SecurityOptions>()
            .Bind(configuration.GetSection(SecurityOptions.SectionName))
            .Validate(
                o => !string.IsNullOrWhiteSpace(o.EncryptionKey),
                "Security:EncryptionKey is required.")
            .Validate(
                o => !string.IsNullOrWhiteSpace(o.IpHashKey),
                "Security:IpHashKey is required.")
            .ValidateOnStart();

        services.AddOptions<FrontendOptions>()
            .Bind(configuration.GetSection(FrontendOptions.SectionName))
            .ValidateOnStart();

        services.AddOptions<PublicScanOptions>()
            .Bind(configuration.GetSection(PublicScanOptions.SectionName))
            .ValidateOnStart();

        services.AddSingleton<IDateTimeProvider, SystemDateTimeProvider>();
        services.AddSingleton<AuditingInterceptor>();

        var connectionString = configuration.GetConnectionString("DefaultConnection");
        if (string.IsNullOrWhiteSpace(connectionString))
        {
            throw new InvalidOperationException(
                "ConnectionStrings:DefaultConnection is not configured. Set ConnectionStrings__DefaultConnection.");
        }

        services.AddDbContext<AppDbContext>((serviceProvider, options) =>
        {
            options.UseSqlServer(connectionString, sql =>
            {
                sql.MigrationsAssembly(typeof(AppDbContext).Assembly.GetName().Name);
                sql.EnableRetryOnFailure(maxRetryCount: 3);
            });

            options.AddInterceptors(serviceProvider.GetRequiredService<AuditingInterceptor>());

            // Cars carry a soft-delete filter while ParkingRequests deliberately do not: the
            // owner-facing queries join through Cars, so the filter is applied there instead of
            // forcing an EXISTS subquery onto every request lookup.
            options.ConfigureWarnings(warnings => warnings.Ignore(
                CoreEventId.PossibleIncorrectRequiredNavigationWithQueryFilterInteractionWarning));
        });

        services.AddScoped<IAppDbContext>(sp => sp.GetRequiredService<AppDbContext>());

        services.AddSingleton<IPasswordHasher, Pbkdf2PasswordHasher>();
        services.AddSingleton<IJwtTokenService, JwtTokenService>();
        services.AddSingleton<IEncryptionService, AesGcmEncryptionService>();
        services.AddSingleton<IIpHasher, HmacIpHasher>();
        services.AddSingleton<ISecureTokenGenerator, SecureTokenGenerator>();
        services.AddSingleton<IQrCodeService, QrCodeService>();
        services.AddSingleton<IPublicUrlBuilder, PublicUrlBuilder>();

        return services;
    }
}
