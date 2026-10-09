using QrCar.Application.Features.PublicScan.Dtos;
using QrCar.Domain.Enums;

namespace QrCar.Application.Features.PublicScan;

/// <summary>
/// Display metadata for the reason chips shown on the public scan page. Lives in code rather
/// than the database so the scan page needs no extra query on a slow mobile connection.
/// </summary>
public static class ParkingReasonCatalog
{
    private static readonly Dictionary<ParkingRequestReason, (string Label, bool RequiresMessage)> Entries =
        new()
        {
            [ParkingRequestReason.BlockingMyCar] = ("You are blocking my car", false),
            [ParkingRequestReason.BlockingExit] = ("You are blocking the exit", false),
            [ParkingRequestReason.LightsLeftOn] = ("Your lights are on", false),
            [ParkingRequestReason.WindowLeftOpen] = ("A window is open", false),
            [ParkingRequestReason.AlarmSounding] = ("Your alarm is going off", false),
            [ParkingRequestReason.ParkedIllegally] = ("Parked in a restricted spot", false),
            [ParkingRequestReason.VehicleDamaged] = ("Your car may be damaged", false),
            [ParkingRequestReason.Other] = ("Something else", true),
        };

    public static IReadOnlyList<ParkingReasonOption> All { get; } = Entries
        .OrderBy(e => (int)e.Key)
        .Select(e => new ParkingReasonOption(e.Key.ToString(), e.Value.Label, e.Value.RequiresMessage))
        .ToList();

    public static bool TryParse(string? code, out ParkingRequestReason reason) =>
        Enum.TryParse(code, ignoreCase: true, out reason) && Entries.ContainsKey(reason);

    public static bool RequiresMessage(ParkingRequestReason reason) =>
        Entries.TryGetValue(reason, out var entry) && entry.RequiresMessage;

    public static string LabelFor(ParkingRequestReason reason) =>
        Entries.TryGetValue(reason, out var entry) ? entry.Label : reason.ToString();
}
