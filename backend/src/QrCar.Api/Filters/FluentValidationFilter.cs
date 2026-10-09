using FluentValidation;
using Microsoft.AspNetCore.Mvc.Filters;
using QrCar.Application.Common.Exceptions;

namespace QrCar.Api.Filters;

/// <summary>
/// Runs any registered FluentValidation validator against the action's bound arguments, so
/// controllers never have to call a validator by hand.
/// </summary>
public class FluentValidationFilter : IAsyncActionFilter
{
    private readonly IServiceProvider _serviceProvider;

    public FluentValidationFilter(IServiceProvider serviceProvider)
    {
        _serviceProvider = serviceProvider;
    }

    public async Task OnActionExecutionAsync(
        ActionExecutingContext context,
        ActionExecutionDelegate next)
    {
        var failures = new Dictionary<string, string[]>();

        foreach (var argument in context.ActionArguments.Values)
        {
            if (argument is null)
            {
                continue;
            }

            var validatorType = typeof(IValidator<>).MakeGenericType(argument.GetType());

            if (_serviceProvider.GetService(validatorType) is not IValidator validator)
            {
                continue;
            }

            var validationContext = new ValidationContext<object>(argument);
            var result = await validator.ValidateAsync(
                validationContext, context.HttpContext.RequestAborted);

            if (result.IsValid)
            {
                continue;
            }

            foreach (var group in result.Errors.GroupBy(error => error.PropertyName))
            {
                failures[group.Key] = group.Select(error => error.ErrorMessage).ToArray();
            }
        }

        if (failures.Count > 0)
        {
            throw new AppValidationException(failures);
        }

        await next();
    }
}
