namespace QrCar.Application.Features.ParkingRequests.Dtos;

public record ParkingRequestResponse(
    Guid Id,
    Guid CarId,
    string CarPlate,
    string CarLabel,
    string Reason,
    string ReasonLabel,
    string? Message,
    string Status,
    string? ResponseType,
    DateTime CreatedAtUtc,
    DateTime? SeenAtUtc,
    DateTime? RespondedAtUtc,
    DateTime ExpiresAtUtc);

public record RespondToParkingRequestRequest(string ResponseType);

public record ParkingRequestFilter
{
    /// <summary>Optional status name, e.g. "Pending". Omit for all statuses.</summary>
    public string? Status { get; init; }

    public Guid? CarId { get; init; }
}
