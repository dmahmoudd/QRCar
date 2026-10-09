using Microsoft.EntityFrameworkCore.Storage.ValueConversion;

namespace QrCar.Infrastructure.Persistence.Converters;

/// <summary>
/// SQL Server's datetime2 stores no timezone, so values read back from the database arrive
/// with <see cref="DateTimeKind.Unspecified"/> and serialize to JSON without a "Z". Clients
/// then parse them as local time and every timestamp is wrong by the client's UTC offset.
/// Re-stamping the kind on read keeps the API's contract unambiguous.
/// </summary>
public class UtcDateTimeConverter : ValueConverter<DateTime, DateTime>
{
    public UtcDateTimeConverter()
        : base(
            value => value.Kind == DateTimeKind.Utc ? value : value.ToUniversalTime(),
            value => DateTime.SpecifyKind(value, DateTimeKind.Utc))
    {
    }
}

public class NullableUtcDateTimeConverter : ValueConverter<DateTime?, DateTime?>
{
    public NullableUtcDateTimeConverter()
        : base(
            value => value.HasValue
                ? value.Value.Kind == DateTimeKind.Utc ? value : value.Value.ToUniversalTime()
                : value,
            value => value.HasValue
                ? DateTime.SpecifyKind(value.Value, DateTimeKind.Utc)
                : value)
    {
    }
}
