using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using QrCar.Application.Common.Interfaces;
using QrCar.Domain.Common;

namespace QrCar.Infrastructure.Persistence.Interceptors;

/// <summary>
/// Fills in audit timestamps so no handler has to remember to. Values already set by a
/// handler are left alone, which keeps unit tests deterministic.
/// </summary>
public class AuditingInterceptor : SaveChangesInterceptor
{
    private readonly IDateTimeProvider _clock;

    public AuditingInterceptor(IDateTimeProvider clock)
    {
        _clock = clock;
    }

    public override InterceptionResult<int> SavingChanges(
        DbContextEventData eventData,
        InterceptionResult<int> result)
    {
        Apply(eventData.Context);
        return base.SavingChanges(eventData, result);
    }

    public override ValueTask<InterceptionResult<int>> SavingChangesAsync(
        DbContextEventData eventData,
        InterceptionResult<int> result,
        CancellationToken cancellationToken = default)
    {
        Apply(eventData.Context);
        return base.SavingChangesAsync(eventData, result, cancellationToken);
    }

    private void Apply(DbContext? context)
    {
        if (context is null)
        {
            return;
        }

        var now = _clock.UtcNow;

        foreach (var entry in context.ChangeTracker.Entries<BaseEntity>())
        {
            switch (entry.State)
            {
                case EntityState.Added when entry.Entity.CreatedAtUtc == default:
                    entry.Entity.CreatedAtUtc = now;
                    break;

                case EntityState.Modified:
                    entry.Entity.UpdatedAtUtc = now;
                    break;
            }
        }
    }
}
