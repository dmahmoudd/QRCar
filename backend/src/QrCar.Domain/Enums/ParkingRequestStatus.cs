namespace QrCar.Domain.Enums;

public enum ParkingRequestStatus
{
    /// <summary>Created by a scanner, owner has not opened it yet.</summary>
    Pending = 1,

    /// <summary>Owner has viewed the request.</summary>
    Seen = 2,

    /// <summary>Owner has replied with an intention (see <see cref="ParkingResponseType"/>).</summary>
    Acknowledged = 3,

    /// <summary>Owner marked the situation as dealt with.</summary>
    Resolved = 4,

    /// <summary>Aged out without a response.</summary>
    Expired = 5,
}
