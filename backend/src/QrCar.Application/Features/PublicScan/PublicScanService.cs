using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using QrCar.Application.Common;
using QrCar.Application.Common.Exceptions;
using QrCar.Application.Common.Interfaces;
using QrCar.Application.Common.Options;
using QrCar.Application.Features.PublicScan.Dtos;
using QrCar.Domain.Entities;
using QrCar.Domain.Enums;

namespace QrCar.Application.Features.PublicScan;

public class PublicScanService : IPublicScanService
{
    private readonly IAppDbContext _db;
    private readonly ISecureTokenGenerator _tokenGenerator;
    private readonly IIpHasher _ipHasher;
    private readonly IEncryptionService _encryption;
    private readonly IDateTimeProvider _clock;
    private readonly PublicScanOptions _options;

    public PublicScanService(
        IAppDbContext db,
        ISecureTokenGenerator tokenGenerator,
        IIpHasher ipHasher,
        IEncryptionService encryption,
        IDateTimeProvider clock,
        IOptions<PublicScanOptions> options)
    {
        _db = db;
        _tokenGenerator = tokenGenerator;
        _ipHasher = ipHasher;
        _encryption = encryption;
        _clock = clock;
        _options = options.Value;
    }

    public IReadOnlyList<ParkingReasonOption> GetReasons() => ParkingReasonCatalog.All;

    public async Task<PublicCarResponse> GetCarByTokenAsync(
        string publicToken,
        CancellationToken cancellationToken = default)
    {
        var car = await LoadCarByTokenAsync(publicToken, cancellationToken);

        car.RegisterScan(_clock.UtcNow);
        await _db.SaveChangesAsync(cancellationToken);

        var owner = car.User;
        var phone = _encryption.Decrypt(owner.PhoneNumberEncrypted);

        return new PublicCarResponse(
            PhoneMasker.Mask(phone),
            owner.ShareLocation,
            owner.ShareLocation ? owner.LastLatitude : null,
            owner.ShareLocation ? owner.LastLongitude : null,
            owner.ShareLocation ? owner.LastLocatedAtUtc : null,
            car.IsActive);
    }

    public async Task<string> GetOwnerPhoneAsync(
        string publicToken,
        CancellationToken cancellationToken = default)
    {
        var car = await LoadCarByTokenAsync(publicToken, cancellationToken);

        if (!car.IsActive)
        {
            throw new ConflictException("This code is not accepting contact right now.");
        }

        return _encryption.Decrypt(car.User.PhoneNumberEncrypted);
    }

    public async Task<ParkingRequestCreatedResponse> CreateRequestAsync(
        string publicToken,
        CreateParkingRequestRequest request,
        string? requesterIp,
        string? userAgent,
        CancellationToken cancellationToken = default)
    {
        var car = await LoadCarByTokenAsync(publicToken, cancellationToken);

        if (!car.IsActive)
        {
            throw new ConflictException("This car is not accepting requests at the moment.");
        }

        if (!ParkingReasonCatalog.TryParse(request.Reason, out var reason))
        {
            throw new AppValidationException(nameof(request.Reason), "Unknown reason code.");
        }

        var message = Sanitize(request.Message);

        if (ParkingReasonCatalog.RequiresMessage(reason) && string.IsNullOrWhiteSpace(message))
        {
            throw new AppValidationException(
                nameof(request.Message),
                "A short note is required when the reason is 'Other'.");
        }

        var now = _clock.UtcNow;
        var ipHash = _ipHasher.Hash(requesterIp);

        await EnforceCooldownAsync(car.Id, ipHash, now, cancellationToken);
        await EnforceDailyCapAsync(car.Id, now, cancellationToken);

        var parkingRequest = new ParkingRequest
        {
            CarId = car.Id,
            TrackingRef = await GenerateUniqueTrackingRefAsync(cancellationToken),
            Reason = reason,
            Message = message,
            RequesterIpHash = ipHash,
            RequesterUserAgent = Truncate(userAgent, 256),
            Status = ParkingRequestStatus.Pending,
            CreatedAtUtc = now,
            ExpiresAtUtc = now.AddHours(_options.RequestLifetimeHours),
        };

        _db.ParkingRequests.Add(parkingRequest);
        await _db.SaveChangesAsync(cancellationToken);

        return new ParkingRequestCreatedResponse(
            parkingRequest.TrackingRef,
            parkingRequest.CreatedAtUtc,
            parkingRequest.ExpiresAtUtc);
    }

    public async Task<PublicRequestStatusResponse> GetRequestStatusAsync(
        string trackingRef,
        CancellationToken cancellationToken = default)
    {
        var reference = trackingRef.Trim().ToUpperInvariant();

        var parkingRequest = await _db.ParkingRequests
            .AsNoTracking()
            .Where(r => r.TrackingRef == reference)
            .Select(r => new
            {
                r.TrackingRef,
                r.Status,
                r.ResponseType,
                r.CreatedAtUtc,
                r.RespondedAtUtc,
                r.ExpiresAtUtc,
            })
            .FirstOrDefaultAsync(cancellationToken)
            ?? throw NotFoundException.For("Request", reference);

        // Reported as expired the moment it lapses, so the scanner sees the truth even if the
        // background sweep has not run yet.
        var status = parkingRequest.Status;
        if (status is ParkingRequestStatus.Pending or ParkingRequestStatus.Seen
            && _clock.UtcNow > parkingRequest.ExpiresAtUtc)
        {
            status = ParkingRequestStatus.Expired;
        }

        return new PublicRequestStatusResponse(
            parkingRequest.TrackingRef,
            status.ToString(),
            parkingRequest.ResponseType?.ToString(),
            parkingRequest.ResponseType is null ? null : LabelFor(parkingRequest.ResponseType.Value),
            parkingRequest.CreatedAtUtc,
            parkingRequest.RespondedAtUtc);
    }

    /// <summary>
    /// Looks the car up by token, ignoring the soft-delete filter so a retired car can be
    /// reported as 410 Gone rather than an ambiguous 404.
    /// </summary>
    private async Task<Car> LoadCarByTokenAsync(string publicToken, CancellationToken cancellationToken)
    {
        var token = publicToken.Trim();

        if (!PublicTokenFormat.IsWellFormed(token))
        {
            throw new NotFoundException("This QR code is not recognised.");
        }

        var car = await _db.Cars
            .IgnoreQueryFilters()
            .Include(c => c.User)
            .FirstOrDefaultAsync(c => c.PublicToken == token, cancellationToken)
            ?? throw new NotFoundException("This QR code is not recognised.");

        if (car.IsDeleted)
        {
            throw new GoneException("This QR code is no longer active.");
        }

        return car;
    }

    private async Task EnforceCooldownAsync(
        Guid carId,
        byte[]? ipHash,
        DateTime now,
        CancellationToken cancellationToken)
    {
        if (ipHash is null)
        {
            return;
        }

        var cooldownStart = now.AddMinutes(-_options.CooldownMinutes);

        var lastRequestAt = await _db.ParkingRequests
            .Where(r => r.CarId == carId
                        && r.RequesterIpHash == ipHash
                        && r.CreatedAtUtc > cooldownStart)
            .OrderByDescending(r => r.CreatedAtUtc)
            .Select(r => (DateTime?)r.CreatedAtUtc)
            .FirstOrDefaultAsync(cancellationToken);

        if (lastRequestAt is null)
        {
            return;
        }

        var retryAfter = lastRequestAt.Value.AddMinutes(_options.CooldownMinutes) - now;

        throw new TooManyRequestsException(
            "You have already contacted this car. Please wait before sending another request.",
            retryAfter > TimeSpan.Zero ? retryAfter : TimeSpan.FromSeconds(1));
    }

    private async Task EnforceDailyCapAsync(
        Guid carId,
        DateTime now,
        CancellationToken cancellationToken)
    {
        var windowStart = now.AddHours(-24);

        var countToday = await _db.ParkingRequests
            .CountAsync(r => r.CarId == carId && r.CreatedAtUtc > windowStart, cancellationToken);

        if (countToday >= _options.MaxRequestsPerCarPerDay)
        {
            throw new TooManyRequestsException(
                "This car has received too many requests today. Please try again later.",
                TimeSpan.FromHours(1));
        }
    }

    private async Task<string> GenerateUniqueTrackingRefAsync(CancellationToken cancellationToken)
    {
        for (var attempt = 0; attempt < 5; attempt++)
        {
            var reference = _tokenGenerator.GenerateTrackingRef();
            var exists = await _db.ParkingRequests
                .AnyAsync(r => r.TrackingRef == reference, cancellationToken);

            if (!exists)
            {
                return reference;
            }
        }

        throw new ConflictException("Could not allocate a tracking reference. Please retry.");
    }

    private string? Sanitize(string? message)
    {
        if (string.IsNullOrWhiteSpace(message))
        {
            return null;
        }

        // Control characters are stripped so a note cannot smuggle newlines or escape
        // sequences into notification templates.
        var cleaned = new string(message
            .Where(ch => !char.IsControl(ch) || ch == ' ')
            .ToArray())
            .Trim();

        return Truncate(cleaned, _options.MaxMessageLength);
    }

    private static string? Truncate(string? value, int maxLength) =>
        string.IsNullOrEmpty(value) || value.Length <= maxLength
            ? value
            : value[..maxLength];

    private static string LabelFor(ParkingResponseType responseType) => responseType switch
    {
        ParkingResponseType.OnMyWay => "The owner is on the way",
        ParkingResponseType.CantMoveNow => "The owner cannot move the car right now",
        ParkingResponseType.NotMyCar => "The owner says this is not their car",
        ParkingResponseType.Ignored => "The owner dismissed this request",
        _ => responseType.ToString(),
    };
}
