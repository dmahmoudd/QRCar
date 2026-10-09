using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using QrCar.Domain.Entities;

namespace QrCar.Infrastructure.Persistence.Configurations;

public class CarConfiguration : IEntityTypeConfiguration<Car>
{
    public void Configure(EntityTypeBuilder<Car> builder)
    {
        builder.ToTable("Cars");

        builder.HasKey(c => c.Id);

        builder.Property(c => c.PlateNumber).HasMaxLength(16).IsRequired();
        builder.Property(c => c.PlateNormalized).HasMaxLength(16).IsRequired();
        builder.Property(c => c.CountryCode).HasMaxLength(2).IsRequired();
        builder.Property(c => c.Make).HasMaxLength(48).IsRequired();
        builder.Property(c => c.Model).HasMaxLength(48).IsRequired();
        builder.Property(c => c.Color).HasMaxLength(24).IsRequired();
        builder.Property(c => c.Nickname).HasMaxLength(48);

        builder.Property(c => c.PublicToken)
            .HasMaxLength(32)
            .IsUnicode(false)
            .IsRequired();

        // The scan endpoint looks a car up by this column on every request, and it must be
        // globally unique because it is the only credential the QR code carries.
        builder.HasIndex(c => c.PublicToken)
            .IsUnique()
            .HasDatabaseName("IX_Cars_PublicToken");

        // One live registration per plate per country. Filtered so a deleted car frees its plate.
        builder.HasIndex(c => new { c.CountryCode, c.PlateNormalized })
            .IsUnique()
            .HasFilter("[IsDeleted] = 0")
            .HasDatabaseName("IX_Cars_Country_Plate");

        builder.HasIndex(c => c.UserId)
            .HasDatabaseName("IX_Cars_UserId");

        builder.Property(c => c.QrVersion).HasDefaultValue(1);
        builder.Property(c => c.IsActive).HasDefaultValue(true);
        builder.Property(c => c.ScanCount).HasDefaultValue(0);
        builder.Property(c => c.IsDeleted).HasDefaultValue(false);

        // Computed in the domain model, never stored.
        builder.Ignore(c => c.MaskedPlate);

        builder.HasMany(c => c.ParkingRequests)
            .WithOne(r => r.Car)
            .HasForeignKey(r => r.CarId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasQueryFilter(c => !c.IsDeleted);
    }
}
