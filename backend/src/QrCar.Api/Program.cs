using System.Text;
using System.Text.Json;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using Microsoft.IdentityModel.Tokens;
using QrCar.Api;
using QrCar.Api.Filters;
using QrCar.Api.HealthChecks;
using QrCar.Api.Middleware;
using QrCar.Api.Services;
using QrCar.Application;
using QrCar.Application.Common.Interfaces;
using QrCar.Infrastructure;
using QrCar.Infrastructure.Identity;
using QrCar.Infrastructure.Persistence;
using QrCar.Infrastructure.QrCodes;
using Scalar.AspNetCore;
using Serilog;

const string CorsPolicyName = "AngularApp";

try
{
    await RunAsync(args);
}
catch (Exception ex)
{
    // MonsterASP / IIS often only shows ERR_CONNECTION_RESET when startup throws.
    // Write a file next to the DLL so WebFTP can show the real exception.
    try
    {
        var errorPath = Path.Combine(AppContext.BaseDirectory, "startup-error.txt");
        await File.WriteAllTextAsync(
            errorPath,
            $"{DateTimeOffset.UtcNow:O}{Environment.NewLine}{ex}");
    }
    catch
    {
        // Ignore secondary IO failures; rethrow the original cause.
    }

    throw;
}

return;

static async Task RunAsync(string[] args)
{
var builder = WebApplication.CreateBuilder(args);

// IIS / ANCM owns the listen address. Binding PORT ourselves breaks in-process IIS
// (MonsterASP.NET). Keep PORT only for container hosts such as Render.
var hostedBehindIis = !string.IsNullOrEmpty(
    Environment.GetEnvironmentVariable("ASPNETCORE_IIS_PHYSICAL_PATH"));

var hostedPort = Environment.GetEnvironmentVariable("PORT");

if (!hostedBehindIis && !string.IsNullOrWhiteSpace(hostedPort))
{
    builder.WebHost.UseUrls($"http://0.0.0.0:{hostedPort}");
}

builder.Host.UseSerilog((context, configuration) => configuration
    .ReadFrom.Configuration(context.Configuration)
    .Enrich.FromLogContext()
    .WriteTo.Console());

// ---------------------------------------------------------------------------
// Application + Infrastructure layers
// ---------------------------------------------------------------------------
builder.Services.AddApplication();
builder.Services.AddInfrastructure(builder.Configuration);

builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<ICurrentUser, CurrentUser>();

// ---------------------------------------------------------------------------
// MVC, validation and error shaping
// ---------------------------------------------------------------------------
builder.Services.AddControllers(options => options.Filters.Add<FluentValidationFilter>());
builder.Services.AddProblemDetails();
builder.Services.AddExceptionHandler<GlobalExceptionHandler>();
builder.Services.AddOpenApi();

// Trusts the proxy's client-IP header so cooldowns key off the real requester rather than
// the load balancer. Only meaningful when the API actually sits behind a trusted proxy.
builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
    if (!builder.Environment.IsDevelopment())
    {
        options.KnownIPNetworks.Clear();
        options.KnownProxies.Clear();
    }
});

// ---------------------------------------------------------------------------
// Authentication
// ---------------------------------------------------------------------------
var jwtOptions = builder.Configuration
    .GetSection(JwtOptions.SectionName)
    .Get<JwtOptions>() ?? new JwtOptions();

builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        // Claims are consumed exactly as they were issued, with no legacy URI remapping.
        options.MapInboundClaims = false;

        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = jwtOptions.Issuer,
            ValidateAudience = true,
            ValidAudience = jwtOptions.Audience,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(jwtOptions.SigningKey)),
            ValidateLifetime = true,
            ClockSkew = TimeSpan.FromSeconds(30),
            NameClaimType = JwtTokenService.NameClaim,
            RoleClaimType = JwtTokenService.RoleClaim,
        };
    });

builder.Services.AddAuthorization();

// ---------------------------------------------------------------------------
// CORS: only the Angular origin may call this API from a browser
// ---------------------------------------------------------------------------
var frontendOptions = builder.Configuration
    .GetSection(FrontendOptions.SectionName)
    .Get<FrontendOptions>() ?? new FrontendOptions();

var corsOrigins = BuildCorsOrigins(frontendOptions, builder.Environment.IsDevelopment());
EnsureProductionFrontendOrigin(frontendOptions, builder.Environment.IsDevelopment());

builder.Services.AddCors(options => options.AddPolicy(CorsPolicyName, policy => policy
    .WithOrigins(corsOrigins)
    .AllowAnyHeader()
    .AllowAnyMethod()
    .WithExposedHeaders("Retry-After")));

// ---------------------------------------------------------------------------
// Rate limiting, partitioned by client IP
// ---------------------------------------------------------------------------
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;

    options.AddPolicy(RateLimitPolicies.Auth, httpContext =>
        RateLimitPartition.GetFixedWindowLimiter(
            ClientPartitionKey(httpContext),
            _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 10,
                Window = TimeSpan.FromMinutes(15),
            }));

    options.AddPolicy(RateLimitPolicies.PublicScan, httpContext =>
        RateLimitPartition.GetFixedWindowLimiter(
            ClientPartitionKey(httpContext),
            _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 30,
                Window = TimeSpan.FromMinutes(1),
            }));

    options.AddPolicy(RateLimitPolicies.PublicRequest, httpContext =>
        RateLimitPartition.GetFixedWindowLimiter(
            ClientPartitionKey(httpContext),
            _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 5,
                Window = TimeSpan.FromMinutes(10),
            }));

    options.OnRejected = async (context, cancellationToken) =>
    {
        if (context.Lease.TryGetMetadata(MetadataName.RetryAfter, out var retryAfter))
        {
            context.HttpContext.Response.Headers.RetryAfter =
                ((int)retryAfter.TotalSeconds).ToString();
        }

        context.HttpContext.Response.ContentType = "application/problem+json";

        await context.HttpContext.Response.WriteAsJsonAsync(
            new ProblemDetails
            {
                Status = StatusCodes.Status429TooManyRequests,
                Title = "Too many requests",
                Detail = "Rate limit exceeded. Please slow down and try again shortly.",
                Instance = context.HttpContext.Request.Path,
            },
            cancellationToken);
    };
});

// ---------------------------------------------------------------------------
// Health checks
// ---------------------------------------------------------------------------
builder.Services.AddScoped<DatabaseHealthCheck>();
builder.Services.AddHealthChecks()
    .AddCheck<DatabaseHealthCheck>("database", tags: ["ready"]);

var app = builder.Build();

await ApplyDatabaseStartupAsync(app);

app.UseForwardedHeaders();
app.UseSerilogRequestLogging();

// Must sit first in the pipeline so it can catch anything thrown downstream.
app.UseExceptionHandler();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.MapScalarApiReference();
}
else
{
    // MonsterASP currently serves this site on HTTP only. Forcing HTTPS here logs
    // "Failed to determine the https port" and would send clients to a dead :443.
    app.UseHsts();
}

app.UseCors(CorsPolicyName);
app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.MapHealthChecks("/health/live", new HealthCheckOptions
{
    Predicate = _ => false,
    ResponseWriter = WriteHealthStatus,
});
app.MapHealthChecks("/health/ready", new HealthCheckOptions
{
    Predicate = check => check.Tags.Contains("ready"),
    ResponseWriter = WriteHealthStatus,
});

await app.RunAsync();
} // RunAsync

static string ClientPartitionKey(HttpContext httpContext) =>
    httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";

static string[] BuildCorsOrigins(FrontendOptions options, bool isDevelopment)
{
    var origins = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

    AddOrigin(origins, options.BaseUrl);

    foreach (var extra in (options.AdditionalOrigins ?? string.Empty).Split(
                 ',',
                 StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
    {
        AddOrigin(origins, extra);
    }

    if (isDevelopment)
    {
        AddOrigin(origins, "http://localhost:4200");
        AddOrigin(origins, "http://127.0.0.1:4200");
        AddOrigin(origins, LanAddress.ReplaceLocalhostWithLan(options.BaseUrl.TrimEnd('/')));
    }

    return [.. origins];
}

static void AddOrigin(ISet<string> origins, string? value)
{
    if (string.IsNullOrWhiteSpace(value))
    {
        return;
    }

    origins.Add(value.Trim().TrimEnd('/'));
}

static void EnsureProductionFrontendOrigin(FrontendOptions options, bool isDevelopment)
{
    if (isDevelopment)
    {
        return;
    }

    if (!Uri.TryCreate(options.BaseUrl.Trim(), UriKind.Absolute, out var uri)
        || uri.Scheme != Uri.UriSchemeHttps
        || string.Equals(uri.Host, "localhost", StringComparison.OrdinalIgnoreCase)
        || string.Equals(uri.Host, "127.0.0.1", StringComparison.OrdinalIgnoreCase))
    {
        throw new InvalidOperationException(
            "Frontend:BaseUrl must be the public HTTPS origin of the Angular app. Set Frontend__BaseUrl.");
    }
}

static async Task ApplyDatabaseStartupAsync(WebApplication app)
{
    var configured = app.Configuration["Database:MigrateOnStartup"];
    var migrate = bool.TryParse(configured, out var parsed)
        ? parsed
        : !app.Environment.IsDevelopment();

    if (!migrate)
    {
        return;
    }

    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    await db.Database.MigrateAsync();
}

static Task WriteHealthStatus(HttpContext context, HealthReport report)
{
    context.Response.ContentType = "application/json; charset=utf-8";
    return context.Response.WriteAsJsonAsync(
        new { status = report.Status.ToString() },
        new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase });
}
