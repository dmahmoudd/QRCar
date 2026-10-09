namespace QrCar.Domain.Enums;

/// <summary>
/// Why the scanner is contacting the owner. Kept as an enum rather than a lookup table
/// so the public scan page can render chips without a database round trip.
/// </summary>
public enum ParkingRequestReason
{
    BlockingMyCar = 1,
    BlockingExit = 2,
    LightsLeftOn = 3,
    WindowLeftOpen = 4,
    AlarmSounding = 5,
    ParkedIllegally = 6,
    VehicleDamaged = 7,
    Other = 99,
}
