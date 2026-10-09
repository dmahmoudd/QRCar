using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using QrCar.Application.Features.Users;
using QrCar.Application.Features.Users.Dtos;

namespace QrCar.Api.Controllers;

[ApiController]
[Route("api/v1/users")]
[Authorize]
public class UsersController : ControllerBase
{
    private readonly IUserService _userService;

    public UsersController(IUserService userService)
    {
        _userService = userService;
    }

    /// <summary>
    /// The signed-in user's profile. This is the only endpoint that returns a phone number,
    /// and only ever the caller's own.
    /// </summary>
    [HttpGet("me")]
    [ProducesResponseType(typeof(UserProfileResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<UserProfileResponse>> GetMyProfile(
        CancellationToken cancellationToken)
    {
        return Ok(await _userService.GetMyProfileAsync(cancellationToken));
    }

    [HttpPut("me")]
    [ProducesResponseType(typeof(UserProfileResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<UserProfileResponse>> UpdateMyProfile(
        UpdateProfileRequest request,
        CancellationToken cancellationToken)
    {
        return Ok(await _userService.UpdateMyProfileAsync(request, cancellationToken));
    }

    [HttpPut("me/location")]
    [ProducesResponseType(typeof(UserProfileResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<UserProfileResponse>> UpdateMyLocation(
        UpdateLocationRequest request,
        CancellationToken cancellationToken)
    {
        return Ok(await _userService.UpdateMyLocationAsync(request, cancellationToken));
    }
}
