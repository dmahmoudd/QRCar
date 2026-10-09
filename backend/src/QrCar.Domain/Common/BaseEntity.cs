namespace QrCar.Domain.Common;

/// <summary>
/// Base for all persisted entities. Ids are UUID v7 so they sort by creation time,
/// which keeps clustered index inserts sequential in SQL Server.
/// </summary>
public abstract class BaseEntity
{
    public Guid Id { get; set; } = Guid.CreateVersion7();

    public DateTime CreatedAtUtc { get; set; }

    public DateTime? UpdatedAtUtc { get; set; }
}
