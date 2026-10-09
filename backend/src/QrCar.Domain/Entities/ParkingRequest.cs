using QrCar.Domain.Common;
using QrCar.Domain.Enums;
using QrCar.Domain.Exceptions;

namespace QrCar.Domain.Entities;

/// <summary>
/// A "please move your car" message raised by an anonymous scanner. Holds no owner
/// identity and no requester identity beyond a keyed hash used for abuse throttling.
/// </summary>
public class ParkingRequest : BaseEntity
{
    public Guid CarId { get; set; }

    public Car Car { get; set; } = null!;

    /// <summary>Short opaque reference handed back to the scanner so they can poll status.</summary>
    public string TrackingRef { get; set; } = null!;

    public ParkingRequestReason Reason { get; set; }

    public string? Message { get; set; }

    /// <summary>HMAC of the requester IP. Keyed so it cannot be brute-forced back to an address.</summary>
    public byte[]? RequesterIpHash { get; set; }

    public string? RequesterUserAgent { get; set; }

    public ParkingRequestStatus Status { get; set; } = ParkingRequestStatus.Pending;

    public ParkingResponseType? ResponseType { get; set; }

    public DateTime? SeenAtUtc { get; set; }

    public DateTime? RespondedAtUtc { get; set; }

    public DateTime ExpiresAtUtc { get; set; }

    private bool IsClosed => Status is ParkingRequestStatus.Resolved or ParkingRequestStatus.Expired;

    public void MarkSeen(DateTime nowUtc)
    {
        if (Status != ParkingRequestStatus.Pending)
        {
            return;
        }

        Status = ParkingRequestStatus.Seen;
        SeenAtUtc = nowUtc;
    }

    public void Respond(ParkingResponseType responseType, DateTime nowUtc)
    {
        if (IsClosed)
        {
            throw new DomainException($"A request that is already {Status} cannot be responded to.");
        }

        Status = ParkingRequestStatus.Acknowledged;
        ResponseType = responseType;
        RespondedAtUtc = nowUtc;
        SeenAtUtc ??= nowUtc;
    }

    public void Resolve(DateTime nowUtc)
    {
        if (Status == ParkingRequestStatus.Expired)
        {
            throw new DomainException("An expired request cannot be resolved.");
        }

        Status = ParkingRequestStatus.Resolved;
        SeenAtUtc ??= nowUtc;
    }
}
