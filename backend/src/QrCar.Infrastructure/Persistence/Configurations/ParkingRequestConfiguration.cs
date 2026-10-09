using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using QrCar.Domain.Entities;

namespace QrCar.Infrastructure.Persistence.Configurations;

public class ParkingRequestConfiguration : IEntityTypeConfiguration<ParkingRequest>
{
    public void Configure(EntityTypeBuilder<ParkingRequest> builder)
    {
        builder.ToTable("ParkingRequests");

        builder.HasKey(r => r.Id);

        builder.Property(r => r.TrackingRef)
            .HasMaxLength(16)
            .IsUnicode(false)
            .IsRequired();

        builder.HasIndex(r => r.TrackingRef)
            .IsUnique()
            .HasDatabaseName("IX_ParkingRequests_TrackingRef");

        builder.Property(r => r.Reason)
            .HasConversion<string>()
            .HasMaxLength(32)
            .IsRequired();

        builder.Property(r => r.Status)
            .HasConversion<string>()
            .HasMaxLength(24)
            .IsRequired();

        builder.Property(r => r.ResponseType)
            .HasConversion<string>()
            .HasMaxLength(24);

        builder.Property(r => r.Message).HasMaxLength(250);

        builder.Property(r => r.RequesterIpHash).HasColumnType("varbinary(32)");

        builder.Property(r => r.RequesterUserAgent).HasMaxLength(256);

        // Serves the owner's inbox, which is always "newest first for one car".
        builder.HasIndex(r => new { r.CarId, r.CreatedAtUtc })
            .HasDatabaseName("IX_ParkingRequests_CarId_CreatedAtUtc");

        // Backs the per-requester cooldown lookup on the public endpoint.
        builder.HasIndex(r => new { r.CarId, r.RequesterIpHash, r.CreatedAtUtc })
            .HasDatabaseName("IX_ParkingRequests_Cooldown");
    }
}
