using QrCar.Application.Common;
using QrCar.Application.Common.Interfaces;
using QrCar.Application.Common.Models;
using QrCar.Application.Features.Cars.Dtos;

namespace QrCar.Application.Features.Cars;

public interface ICarService
{
    Task<PagedResult<CarResponse>> GetMyCarsAsync(
        PagingParameters paging,
        CancellationToken cancellationToken = default);

    Task<CarResponse> GetByIdAsync(Guid carId, CancellationToken cancellationToken = default);

    Task<CarResponse> CreateAsync(
        CreateCarRequest request,
        CancellationToken cancellationToken = default);

    Task<CarResponse> UpdateAsync(
        Guid carId,
        UpdateCarRequest request,
        CancellationToken cancellationToken = default);

    Task DeleteAsync(Guid carId, CancellationToken cancellationToken = default);

    Task<QrCodeResponse> GetQrCodeAsync(Guid carId, CancellationToken cancellationToken = default);

    Task<QrCodeResponse> RotateQrCodeAsync(Guid carId, CancellationToken cancellationToken = default);

    Task<QrImageResult> GetQrImageAsync(
        Guid carId,
        QrImageFormat format,
        int targetSizePixels,
        CancellationToken cancellationToken = default);
}
