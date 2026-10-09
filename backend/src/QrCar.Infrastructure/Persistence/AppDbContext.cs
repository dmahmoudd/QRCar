using Microsoft.EntityFrameworkCore;
using QrCar.Application.Common.Interfaces;
using QrCar.Domain.Entities;
using QrCar.Infrastructure.Persistence.Converters;

namespace QrCar.Infrastructure.Persistence;

public class AppDbContext : DbContext, IAppDbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    public DbSet<User> Users => Set<User>();

    public DbSet<Car> Cars => Set<Car>();

    public DbSet<ParkingRequest> ParkingRequests => Set<ParkingRequest>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);
        base.OnModelCreating(modelBuilder);
    }

    /// <summary>
    /// Guarantees every DateTime leaving the database is tagged as UTC, so JSON responses
    /// always carry the "Z" suffix and clients cannot misread them as local time.
    /// </summary>
    protected override void ConfigureConventions(ModelConfigurationBuilder configurationBuilder)
    {
        configurationBuilder.Properties<DateTime>().HaveConversion<UtcDateTimeConverter>();
        configurationBuilder.Properties<DateTime?>().HaveConversion<NullableUtcDateTimeConverter>();

        base.ConfigureConventions(configurationBuilder);
    }
}
