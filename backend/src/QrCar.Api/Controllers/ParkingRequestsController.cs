using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using QrCar.Application.Common;
using QrCar.Application.Common.Models;
using QrCar.Application.Features.ParkingRequests;
using QrCar.Application.Features.ParkingRequests.Dtos;

namespace QrCar.Api.Controllers;

/// <summary>The owner's inbox of "please move your car" messages.</summary>
[ApiController]
[Route("api/v1/parking-requests")]
[Authorize]
public class ParkingRequestsController : ControllerBase
{
    private readonly IParkingRequestService _parkingRequestService;

    public ParkingRequestsController(IParkingRequestService parkingRequestService)
    {
        _parkingRequestService = parkingRequestService;
    }

    [HttpGet]
    [ProducesResponseType(typeof(PagedResult<ParkingRequestResponse>), StatusCodes.Status200OK)]
    public async Task<ActionResult<PagedResult<ParkingRequestResponse>>> GetInbox(
        [FromQuery] ParkingRequestFilter filter,
        [FromQuery] PagingParameters paging,
        CancellationToken cancellationToken)
    {
        return Ok(await _parkingRequestService.GetInboxAsync(filter, paging, cancellationToken));
    }

    /// <summary>Fetches a single request and marks it as seen.</summary>
    [HttpGet("{requestId:guid}")]
    [ProducesResponseType(typeof(ParkingRequestResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ParkingRequestResponse>> GetById(
        Guid requestId,
        CancellationToken cancellationToken)
    {
        return Ok(await _parkingRequestService.GetByIdAsync(requestId, cancellationToken));
    }

    /// <summary>
    /// Tells the waiting scanner what the owner intends to do, e.g. OnMyWay or CantMoveNow.
    /// </summary>
    [HttpPost("{requestId:guid}/respond")]
    [ProducesResponseType(typeof(ParkingRequestResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<ParkingRequestResponse>> Respond(
        Guid requestId,
        RespondToParkingRequestRequest request,
        CancellationToken cancellationToken)
    {
        return Ok(await _parkingRequestService.RespondAsync(requestId, request, cancellationToken));
    }

    [HttpPost("{requestId:guid}/resolve")]
    [ProducesResponseType(typeof(ParkingRequestResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<ParkingRequestResponse>> Resolve(
        Guid requestId,
        CancellationToken cancellationToken)
    {
        return Ok(await _parkingRequestService.ResolveAsync(requestId, cancellationToken));
    }
}
