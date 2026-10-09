using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using QrCar.Application.Common;
using QrCar.Application.Common.Interfaces;
using QrCar.Application.Common.Models;
using QrCar.Application.Features.Cars;
using QrCar.Application.Features.Cars.Dtos;

namespace QrCar.Api.Controllers;

[ApiController]
[Route("api/v1/cars")]
[Authorize]
public class CarsController : ControllerBase
{
    private const int DefaultQrSizePixels = 512;

    private readonly ICarService _carService;

    public CarsController(ICarService carService)
    {
        _carService = carService;
    }

    [HttpGet]
    [ProducesResponseType(typeof(PagedResult<CarResponse>), StatusCodes.Status200OK)]
    public async Task<ActionResult<PagedResult<CarResponse>>> GetMyCars(
        [FromQuery] PagingParameters paging,
        CancellationToken cancellationToken)
    {
        return Ok(await _carService.GetMyCarsAsync(paging, cancellationToken));
    }

    [HttpGet("{carId:guid}")]
    [ProducesResponseType(typeof(CarResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<CarResponse>> GetById(
        Guid carId,
        CancellationToken cancellationToken)
    {
        return Ok(await _carService.GetByIdAsync(carId, cancellationToken));
    }

    /// <summary>Registers a car and mints its first QR token.</summary>
    [HttpPost]
    [ProducesResponseType(typeof(CarResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<CarResponse>> Create(
        CreateCarRequest request,
        CancellationToken cancellationToken)
    {
        var car = await _carService.CreateAsync(request, cancellationToken);
        return CreatedAtAction(nameof(GetById), new { carId = car.Id }, car);
    }

    [HttpPut("{carId:guid}")]
    [ProducesResponseType(typeof(CarResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<CarResponse>> Update(
        Guid carId,
        UpdateCarRequest request,
        CancellationToken cancellationToken)
    {
        return Ok(await _carService.UpdateAsync(carId, request, cancellationToken));
    }

    [HttpDelete("{carId:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> Delete(Guid carId, CancellationToken cancellationToken)
    {
        await _carService.DeleteAsync(carId, cancellationToken);
        return NoContent();
    }

    /// <summary>The car's QR token and the exact URL encoded into its printed code.</summary>
    [HttpGet("{carId:guid}/qr")]
    [ProducesResponseType(typeof(QrCodeResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<QrCodeResponse>> GetQrCode(
        Guid carId,
        CancellationToken cancellationToken)
    {
        NoStore();
        return Ok(await _carService.GetQrCodeAsync(carId, cancellationToken));
    }

    /// <summary>
    /// Issues a replacement token. Every sticker already printed for this car stops working,
    /// which is the fix for a code that has been photographed or abused.
    /// </summary>
    [HttpPost("{carId:guid}/qr/rotate")]
    [ProducesResponseType(typeof(QrCodeResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<QrCodeResponse>> RotateQrCode(
        Guid carId,
        CancellationToken cancellationToken)
    {
        NoStore();
        return Ok(await _carService.RotateQrCodeAsync(carId, cancellationToken));
    }

    /// <summary>Renders the QR code as a PNG or SVG ready for printing.</summary>
    [HttpGet("{carId:guid}/qr/image")]
    [ProducesResponseType(typeof(FileContentResult), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetQrImage(
        Guid carId,
        [FromQuery] QrImageFormat format = QrImageFormat.Png,
        [FromQuery] int size = DefaultQrSizePixels,
        CancellationToken cancellationToken = default)
    {
        var image = await _carService.GetQrImageAsync(carId, format, size, cancellationToken);

        NoStore();
        Response.Headers.ContentDisposition = $"inline; filename=\"{image.FileName}\"";

        return File(image.Content, image.ContentType);
    }

    /// <summary>
    /// QR payloads are effectively credentials, so they must never sit in a shared cache.
    /// </summary>
    private void NoStore() =>
        Response.Headers.CacheControl = "private, no-store, max-age=0";
}
