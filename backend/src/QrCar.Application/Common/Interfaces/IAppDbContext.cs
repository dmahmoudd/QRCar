using Microsoft.EntityFrameworkCore;
using QrCar.Domain.Entities;

namespace QrCar.Application.Common.Interfaces;

/// <summary>
/// The Application layer's view of persistence. Infrastructure supplies the EF Core
/// implementation, which keeps handlers testable without a database.
/// </summary>
public interface IAppDbContext
{
    DbSet<User> Users { get; }

    DbSet<Car> Cars { get; }

    DbSet<ParkingRequest> ParkingRequests { get; }

    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}
