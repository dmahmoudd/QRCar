using Microsoft.EntityFrameworkCore;
using QrCar.Application.Common;
using QrCar.Application.Common.Exceptions;
using QrCar.Application.Common.Interfaces;
using QrCar.Application.Common.Models;
using QrCar.Application.Features.Cars.Dtos;
using QrCar.Domain.Entities;

namespace QrCar.Application.Features.Cars;

public class CarService : ICarService
{
    private const int MinQrSizePixels = 128;
    private const int MaxQrSizePixels = 2048;

    private readonly IAppDbContext _db;
    private readonly ICurrentUser _currentUser;
    private readonly IQrCodeService _qrCodeService;
    private readonly ISecureTokenGenerator _tokenGenerator;
    private readonly IPublicUrlBuilder _urlBuilder;
    private readonly IDateTimeProvider _clock;

    public CarService(
        IAppDbContext db,
        ICurrentUser currentUser,
        IQrCodeService qrCodeService,
        ISecureTokenGenerator tokenGenerator,
        IPublicUrlBuilder urlBuilder,
        IDateTimeProvider clock)
    {
        _db = db;
        _currentUser = currentUser;
        _qrCodeService = qrCodeService;
        _tokenGenerator = tokenGenerator;
        _urlBuilder = urlBuilder;
        _clock = clock;
    }

    public async Task<PagedResult<CarResponse>> GetMyCarsAsync(
        PagingParameters paging,
        CancellationToken cancellationToken = default)
    {
        var userId = _currentUser.RequireUserId();

        var query = _db.Cars
            .Where(c => c.UserId == userId)
            .OrderByDescending(c => c.CreatedAtUtc);

        var totalCount = await query.CountAsync(cancellationToken);

        // Projected inline rather than through a helper so EF Core can translate it to SQL.
        var items = await query
            .Skip(paging.Skip)
            .Take(paging.PageSize)
            .AsNoTracking()
            .Select(c => new CarResponse(
                c.Id,
                c.PlateNumber,
                c.CountryCode,
                c.Make,
                c.Model,
                c.Color,
                c.Nickname,
                c.IsActive,
                c.QrVersion,
                c.ScanCount,
                c.LastScannedAtUtc,
                c.CreatedAtUtc))
            .ToListAsync(cancellationToken);

        return new PagedResult<CarResponse>(items, totalCount, paging.Page, paging.PageSize);
    }

    public async Task<CarResponse> GetByIdAsync(
        Guid carId,
        CancellationToken cancellationToken = default)
    {
        var car = await LoadOwnedCarAsync(carId, cancellationToken);
        return Map(car);
    }

    public async Task<CarResponse> CreateAsync(
        CreateCarRequest request,
        CancellationToken cancellationToken = default)
    {
        var userId = _currentUser.RequireUserId();
        var publicToken = await GenerateUniqueTokenAsync(cancellationToken);
        // Internal plate keeps the unique index happy; scanners never see it.
        var plateNumber = $"QR-{publicToken[..8]}";

        var car = new Car
        {
            UserId = userId,
            PlateNumber = plateNumber,
            PlateNormalized = TextNormalizer.NormalizePlate(plateNumber),
            CountryCode = "QR",
            Make = "Sticker",
            Model = "QR",
            Color = "—",
            Nickname = string.IsNullOrWhiteSpace(request.Nickname) ? null : request.Nickname.Trim(),
            PublicToken = publicToken,
            QrVersion = 1,
            IsActive = true,
            CreatedAtUtc = _clock.UtcNow,
        };

        _db.Cars.Add(car);
        await _db.SaveChangesAsync(cancellationToken);

        return Map(car);
    }

    public async Task<CarResponse> UpdateAsync(
        Guid carId,
        UpdateCarRequest request,
        CancellationToken cancellationToken = default)
    {
        var car = await LoadOwnedCarAsync(carId, cancellationToken);

        car.Nickname = string.IsNullOrWhiteSpace(request.Nickname) ? null : request.Nickname.Trim();
        car.IsActive = request.IsActive;
        car.UpdatedAtUtc = _clock.UtcNow;

        await _db.SaveChangesAsync(cancellationToken);

        return Map(car);
    }

    /// <summary>
    /// Soft delete. Parking request history stays intact, and the token stops resolving,
    /// so a sticker that is still stuck to a sold car cannot be used to reach the old owner.
    /// </summary>
    public async Task DeleteAsync(Guid carId, CancellationToken cancellationToken = default)
    {
        var car = await LoadOwnedCarAsync(carId, cancellationToken);

        car.IsDeleted = true;
        car.DeletedAtUtc = _clock.UtcNow;
        car.IsActive = false;

        await _db.SaveChangesAsync(cancellationToken);
    }

    public async Task<QrCodeResponse> GetQrCodeAsync(
        Guid carId,
        CancellationToken cancellationToken = default)
    {
        var car = await LoadOwnedCarAsync(carId, cancellationToken);
        return MapQr(car);
    }

    /// <summary>
    /// Issues a brand new token. Every sticker already printed stops working immediately,
    /// which is the remedy when a code has been photographed or abused.
    /// </summary>
    public async Task<QrCodeResponse> RotateQrCodeAsync(
        Guid carId,
        CancellationToken cancellationToken = default)
    {
        var car = await LoadOwnedCarAsync(carId, cancellationToken);

        car.PublicToken = await GenerateUniqueTokenAsync(cancellationToken);
        car.QrVersion++;
        car.ScanCount = 0;
        car.LastScannedAtUtc = null;
        car.UpdatedAtUtc = _clock.UtcNow;

        await _db.SaveChangesAsync(cancellationToken);

        return MapQr(car);
    }

    public async Task<QrImageResult> GetQrImageAsync(
        Guid carId,
        QrImageFormat format,
        int targetSizePixels,
        CancellationToken cancellationToken = default)
    {
        var car = await LoadOwnedCarAsync(carId, cancellationToken);
        var size = Math.Clamp(targetSizePixels, MinQrSizePixels, MaxQrSizePixels);
        var scanUrl = _urlBuilder.BuildScanUrl(car.PublicToken);
        var fileStem = $"qr-{car.PlateNormalized}-v{car.QrVersion}";

        return format switch
        {
            QrImageFormat.Svg => new QrImageResult(
                System.Text.Encoding.UTF8.GetBytes(_qrCodeService.GenerateSvg(scanUrl, size)),
                "image/svg+xml",
                $"{fileStem}.svg"),
            _ => new QrImageResult(
                _qrCodeService.GeneratePng(scanUrl, size),
                "image/png",
                $"{fileStem}.png"),
        };
    }

    private async Task<Car> LoadOwnedCarAsync(Guid carId, CancellationToken cancellationToken)
    {
        var userId = _currentUser.RequireUserId();

        var car = await _db.Cars.FirstOrDefaultAsync(c => c.Id == carId, cancellationToken)
                  ?? throw NotFoundException.For("Car", carId);

        // Reported as 404 rather than 403 so the endpoint cannot confirm that a car id exists.
        if (car.UserId != userId)
        {
            throw NotFoundException.For("Car", carId);
        }

        return car;
    }

    private async Task<string> GenerateUniqueTokenAsync(CancellationToken cancellationToken)
    {
        // A 128-bit collision is not realistically reachable, but the unique index would
        // throw at SaveChanges, so a bounded retry keeps the failure mode graceful.
        for (var attempt = 0; attempt < 5; attempt++)
        {
            var token = _tokenGenerator.GeneratePublicToken();
            var exists = await _db.Cars
                .IgnoreQueryFilters()
                .AnyAsync(c => c.PublicToken == token, cancellationToken);

            if (!exists)
            {
                return token;
            }
        }

        throw new ConflictException("Could not allocate a unique QR token. Please retry.");
    }

    private QrCodeResponse MapQr(Car car) => new(
        car.Id,
        car.PublicToken,
        _urlBuilder.BuildScanUrl(car.PublicToken),
        car.QrVersion,
        car.ScanCount,
        car.LastScannedAtUtc);

    private static CarResponse Map(Car c) => new(
        c.Id,
        c.PlateNumber,
        c.CountryCode,
        c.Make,
        c.Model,
        c.Color,
        c.Nickname,
        c.IsActive,
        c.QrVersion,
        c.ScanCount,
        c.LastScannedAtUtc,
        c.CreatedAtUtc);
}
