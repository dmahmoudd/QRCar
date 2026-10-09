using FluentValidation;
using QrCar.Application.Features.ParkingRequests.Dtos;

namespace QrCar.Application.Features.ParkingRequests.Validators;

public class RespondToParkingRequestRequestValidator
    : AbstractValidator<RespondToParkingRequestRequest>
{
    public RespondToParkingRequestRequestValidator()
    {
        RuleFor(x => x.ResponseType)
            .NotEmpty()
            .WithMessage("A response type is required, e.g. OnMyWay.");
    }
}
