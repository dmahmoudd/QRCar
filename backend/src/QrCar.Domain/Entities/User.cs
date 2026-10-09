using QrCar.Domain.Common;
using QrCar.Domain.Enums;

namespace QrCar.Domain.Entities;

public class User : BaseEntity
{
    public string FullName { get; set; } = null!;

    public string Email { get; set; } = null!;

    /// <summary>Upper-cased email, used for the unique index and for lookups.</summary>
    public string NormalizedEmail { get; set; } = null!;

    public string PasswordHash { get; set; } = null!;

    /// <summary>
    /// Phone number in E.164, encrypted with AES-GCM. Never leaves the server in plaintext
    /// except to the owner themselves via the profile endpoint.
    /// </summary>
    public byte[] PhoneNumberEncrypted { get; set; } = [];

    /// <summary>Last four digits, stored in the clear so the owner's own UI can show a hint.</summary>
    public string PhoneLast4 { get; set; } = null!;

    public UserRole Role { get; set; } = UserRole.User;

    public bool IsActive { get; set; } = true;

    /// <summary>
    /// When true, the last reported coordinates are shown to whoever scans a QR.
    /// A powered-off phone cannot update this; scanners only ever see the last ping.
    /// </summary>
    public bool ShareLocation { get; set; }

    public double? LastLatitude { get; set; }

    public double? LastLongitude { get; set; }

    public DateTime? LastLocatedAtUtc { get; set; }

    public ICollection<Car> Cars { get; set; } = new List<Car>();
}
