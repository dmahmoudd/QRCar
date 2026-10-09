using QrCar.Application.Common;
using QrCar.Application.Common.Models;
using QrCar.Application.Features.ParkingRequests.Dtos;

namespace QrCar.Application.Features.ParkingRequests;

public interface IParkingRequestService
{
    Task<PagedResult<ParkingRequestResponse>> GetInboxAsync(
        ParkingRequestFilter filter,
        PagingParameters paging,
        CancellationToken cancellationToken = default);

    /// <summary>Fetches one request and marks it as seen.</summary>
    Task<ParkingRequestResponse> GetByIdAsync(
        Guid requestId,
        CancellationToken cancellationToken = default);

    Task<ParkingRequestResponse> RespondAsync(
        Guid requestId,
        RespondToParkingRequestRequest request,
        CancellationToken cancellationToken = default);

    Task<ParkingRequestResponse> ResolveAsync(
        Guid requestId,
        CancellationToken cancellationToken = default);
}
