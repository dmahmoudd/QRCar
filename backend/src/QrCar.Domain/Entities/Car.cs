using QrCar.Domain.Common;

namespace QrCar.Domain.Entities;

public class Car : BaseEntity, ISoftDeletable
{
    public Guid UserId { get; set; }

    public User User { get; set; } = null!;

    public string PlateNumber { get; set; } = null!;

    /// <summary>Plate stripped of spaces, dashes and casing. Unique per country.</summary>
    public string PlateNormalized { get; set; } = null!;

    public string CountryCode { get; set; } = null!;

    public string Make { get; set; } = null!;

    public string Model { get; set; } = null!;

    public string Color { get; set; } = null!;

    public string? Nickname { get; set; }

    /// <summary>
    /// The only identifier embedded in the printed QR code: 128 bits of randomness,
    /// base64url encoded. Rotating it invalidates every sticker already printed.
    /// </summary>
    public string PublicToken { get; set; } = null!;

    /// <summary>Incremented on every rotation, so the owner can tell stickers apart.</summary>
    public int QrVersion { get; set; } = 1;

    /// <summary>When false the QR still resolves but refuses new parking requests.</summary>
    public bool IsActive { get; set; } = true;

    public int ScanCount { get; set; }

    public DateTime? LastScannedAtUtc { get; set; }

    public bool IsDeleted { get; set; }

    public DateTime? DeletedAtUtc { get; set; }

    public ICollection<ParkingRequest> ParkingRequests { get; set; } = new List<ParkingRequest>();

    /// <summary>
    /// Plate with everything but the final four characters replaced, so a scanner can confirm
    /// they are looking at the right car without the full plate being harvestable.
    /// </summary>
    public string MaskedPlate
    {
        get
        {
            var plate = PlateNumber ?? string.Empty;
            if (plate.Length <= 4)
            {
                return plate;
            }

            var visible = plate[^4..];
            return new string('•', plate.Length - 4) + visible;
        }
    }

    public void RegisterScan(DateTime nowUtc)
    {
        ScanCount++;
        LastScannedAtUtc = nowUtc;
    }
}
