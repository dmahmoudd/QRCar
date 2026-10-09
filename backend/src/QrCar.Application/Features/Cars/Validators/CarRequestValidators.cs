using FluentValidation;
using QrCar.Application.Features.Cars.Dtos;

namespace QrCar.Application.Features.Cars.Validators;

public class CreateCarRequestValidator : AbstractValidator<CreateCarRequest>
{
    public CreateCarRequestValidator()
    {
        RuleFor(x => x.Nickname).MaximumLength(48);
    }
}

public class UpdateCarRequestValidator : AbstractValidator<UpdateCarRequest>
{
    public UpdateCarRequestValidator()
    {
        RuleFor(x => x.Nickname).MaximumLength(48);
    }
}
