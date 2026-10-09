using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using QrCar.Domain.Entities;

namespace QrCar.Infrastructure.Persistence.Configurations;

public class UserConfiguration : IEntityTypeConfiguration<User>
{
    public void Configure(EntityTypeBuilder<User> builder)
    {
        builder.ToTable("Users");

        builder.HasKey(u => u.Id);

        builder.Property(u => u.FullName)
            .HasMaxLength(120)
            .IsRequired();

        builder.Property(u => u.Email)
            .HasMaxLength(256)
            .IsRequired();

        builder.Property(u => u.NormalizedEmail)
            .HasMaxLength(256)
            .IsRequired();

        builder.HasIndex(u => u.NormalizedEmail)
            .IsUnique()
            .HasDatabaseName("IX_Users_NormalizedEmail");

        builder.Property(u => u.PasswordHash)
            .HasMaxLength(256)
            .IsRequired();

        builder.Property(u => u.PhoneNumberEncrypted)
            .HasColumnType("varbinary(256)")
            .IsRequired();

        builder.Property(u => u.PhoneLast4)
            .HasMaxLength(4)
            .IsRequired();

        builder.Property(u => u.Role)
            .HasConversion<string>()
            .HasMaxLength(24)
            .IsRequired();

        builder.Property(u => u.CreatedAtUtc).IsRequired();

        builder.Property(u => u.ShareLocation).IsRequired();
        builder.Property(u => u.LastLatitude);
        builder.Property(u => u.LastLongitude);
        builder.Property(u => u.LastLocatedAtUtc);

        builder.HasMany(u => u.Cars)
            .WithOne(c => c.User)
            .HasForeignKey(c => c.UserId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
