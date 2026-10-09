using Microsoft.EntityFrameworkCore;
using QrCar.Application.Common;
using QrCar.Application.Common.Exceptions;
using QrCar.Application.Common.Interfaces;
using QrCar.Application.Common.Models;
using QrCar.Application.Features.ParkingRequests.Dtos;
using QrCar.Application.Features.PublicScan;
using QrCar.Domain.Entities;
using QrCar.Domain.Enums;

namespace QrCar.Application.Features.ParkingRequests;

public class ParkingRequestService : IParkingRequestService
{
    private readonly IAppDbContext _db;
    private readonly ICurrentUser _currentUser;
    private readonly IDateTimeProvider _clock;

    public ParkingRequestService(
        IAppDbContext db,
        ICurrentUser currentUser,
        IDateTimeProvider clock)
    {
        _db = db;
        _currentUser = currentUser;
        _clock = clock;
    }

    public async Task<PagedResult<ParkingRequestResponse>> GetInboxAsync(
        ParkingRequestFilter filter,
        PagingParameters paging,
        CancellationToken cancellationToken = default)
    {
        var userId = _currentUser.RequireUserId();

        // Joined against the Cars set so the soft-delete filter applies: requests for a
        // deleted car drop out of the inbox automatically.
        var query = from request in _db.ParkingRequests
                    join car in _db.Cars on request.CarId equals car.Id
                    where car.UserId == userId
                    select new { Request = request, Car = car };

        if (filter.CarId is { } carId)
        {
            query = query.Where(x => x.Car.Id == carId);
        }

        if (!string.IsNullOrWhiteSpace(filter.Status))
        {
            if (!Enum.TryParse<ParkingRequestStatus>(filter.Status, ignoreCase: true, out var status))
            {
                throw new AppValidationException(nameof(filter.Status), "Unknown status value.");
            }

            query = query.Where(x => x.Request.Status == status);
        }

        var totalCount = await query.CountAsync(cancellationToken);

        var rows = await query
            .OrderByDescending(x => x.Request.CreatedAtUtc)
            .Skip(paging.Skip)
            .Take(paging.PageSize)
            .AsNoTracking()
            .Select(x => new ProjectedRow(
                x.Request.Id,
                x.Car.Id,
                x.Car.PlateNumber,
                x.Car.Make,
                x.Car.Model,
                x.Car.Color,
                x.Request.Reason,
                x.Request.Message,
                x.Request.Status,
                x.Request.ResponseType,
                x.Request.CreatedAtUtc,
                x.Request.SeenAtUtc,
                x.Request.RespondedAtUtc,
                x.Request.ExpiresAtUtc))
            .ToListAsync(cancellationToken);

        // Reason labels come from an in-memory catalogue, so they are applied after the query.
        var items = rows.Select(MapRow).ToList();

        return new PagedResult<ParkingRequestResponse>(
            items, totalCount, paging.Page, paging.PageSize);
    }

    public async Task<ParkingRequestResponse> GetByIdAsync(
        Guid requestId,
        CancellationToken cancellationToken = default)
    {
        var (request, car) = await LoadOwnedRequestAsync(requestId, cancellationToken);

        request.MarkSeen(_clock.UtcNow);
        await _db.SaveChangesAsync(cancellationToken);

        return Map(request, car);
    }

    public async Task<ParkingRequestResponse> RespondAsync(
        Guid requestId,
        RespondToParkingRequestRequest request,
        CancellationToken cancellationToken = default)
    {
        if (!Enum.TryParse<ParkingResponseType>(request.ResponseType, ignoreCase: true, out var responseType))
        {
            throw new AppValidationException(
                nameof(request.ResponseType),
                $"Must be one of: {string.Join(", ", Enum.GetNames<ParkingResponseType>())}.");
        }

        var (parkingRequest, car) = await LoadOwnedRequestAsync(requestId, cancellationToken);

        await ExpireIfLapsedAsync(parkingRequest, cancellationToken);

        parkingRequest.Respond(responseType, _clock.UtcNow);
        await _db.SaveChangesAsync(cancellationToken);

        return Map(parkingRequest, car);
    }

    public async Task<ParkingRequestResponse> ResolveAsync(
        Guid requestId,
        CancellationToken cancellationToken = default)
    {
        var (parkingRequest, car) = await LoadOwnedRequestAsync(requestId, cancellationToken);

        parkingRequest.Resolve(_clock.UtcNow);
        await _db.SaveChangesAsync(cancellationToken);

        return Map(parkingRequest, car);
    }

    /// <summary>
    /// Flips a lapsed request to Expired before any state change is attempted, so the domain
    /// rules operate on an accurate status.
    /// </summary>
    private async Task ExpireIfLapsedAsync(
        ParkingRequest request,
        CancellationToken cancellationToken)
    {
        var isOpen = request.Status is ParkingRequestStatus.Pending or ParkingRequestStatus.Seen;

        if (!isOpen || _clock.UtcNow <= request.ExpiresAtUtc)
        {
            return;
        }

        request.Status = ParkingRequestStatus.Expired;
        await _db.SaveChangesAsync(cancellationToken);

        throw new ConflictException("This request has expired and can no longer be answered.");
    }

    private async Task<(ParkingRequest Request, Car Car)> LoadOwnedRequestAsync(
        Guid requestId,
        CancellationToken cancellationToken)
    {
        var userId = _currentUser.RequireUserId();

        var row = await (from request in _db.ParkingRequests
                         join car in _db.Cars on request.CarId equals car.Id
                         where request.Id == requestId
                         select new { Request = request, Car = car })
            .FirstOrDefaultAsync(cancellationToken)
            ?? throw NotFoundException.For("ParkingRequest", requestId);

        if (row.Car.UserId != userId)
        {
            throw NotFoundException.For("ParkingRequest", requestId);
        }

        return (row.Request, row.Car);
    }

    private static ParkingRequestResponse Map(ParkingRequest request, Car car) => MapRow(
        new ProjectedRow(
            request.Id,
            car.Id,
            car.PlateNumber,
            car.Make,
            car.Model,
            car.Color,
            request.Reason,
            request.Message,
            request.Status,
            request.ResponseType,
            request.CreatedAtUtc,
            request.SeenAtUtc,
            request.RespondedAtUtc,
            request.ExpiresAtUtc));

    private static ParkingRequestResponse MapRow(ProjectedRow row) => new(
        row.Id,
        row.CarId,
        row.PlateNumber,
        $"{row.Color} {row.Make} {row.Model}",
        row.Reason.ToString(),
        ParkingReasonCatalog.LabelFor(row.Reason),
        row.Message,
        row.Status.ToString(),
        row.ResponseType?.ToString(),
        row.CreatedAtUtc,
        row.SeenAtUtc,
        row.RespondedAtUtc,
        row.ExpiresAtUtc);

    private record ProjectedRow(
        Guid Id,
        Guid CarId,
        string PlateNumber,
        string Make,
        string Model,
        string Color,
        ParkingRequestReason Reason,
        string? Message,
        ParkingRequestStatus Status,
        ParkingResponseType? ResponseType,
        DateTime CreatedAtUtc,
        DateTime? SeenAtUtc,
        DateTime? RespondedAtUtc,
        DateTime ExpiresAtUtc);
}
