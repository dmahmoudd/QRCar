using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;
using QrCar.Application.Common.Exceptions;
using QrCar.Domain.Exceptions;

namespace QrCar.Api.Middleware;

/// <summary>
/// Translates every exception the application can raise into an RFC 7807 problem response.
/// This is the single place where an exception type becomes an HTTP status code.
/// </summary>
public class GlobalExceptionHandler : IExceptionHandler
{
    private readonly ILogger<GlobalExceptionHandler> _logger;

    public GlobalExceptionHandler(ILogger<GlobalExceptionHandler> logger)
    {
        _logger = logger;
    }

    public async ValueTask<bool> TryHandleAsync(
        HttpContext httpContext,
        Exception exception,
        CancellationToken cancellationToken)
    {
        var problem = BuildProblem(httpContext, exception);

        if (problem.Status >= StatusCodes.Status500InternalServerError)
        {
            _logger.LogError(exception, "Unhandled exception on {Method} {Path}",
                httpContext.Request.Method, httpContext.Request.Path);
        }
        else
        {
            _logger.LogInformation("Request rejected with {Status}: {Message}",
                problem.Status, exception.Message);
        }

        if (exception is TooManyRequestsException { RetryAfter: { } retryAfter })
        {
            httpContext.Response.Headers.RetryAfter =
                ((int)Math.Ceiling(retryAfter.TotalSeconds)).ToString();
        }

        httpContext.Response.StatusCode = problem.Status ?? StatusCodes.Status500InternalServerError;
        httpContext.Response.ContentType = "application/problem+json";

        await httpContext.Response.WriteAsJsonAsync(problem, problem.GetType(), null, cancellationToken);

        return true;
    }

    private static ProblemDetails BuildProblem(HttpContext httpContext, Exception exception)
    {
        var instance = httpContext.Request.Path.Value;

        return exception switch
        {
            AppValidationException validation => new ValidationProblemDetails(validation.Errors)
            {
                Status = StatusCodes.Status400BadRequest,
                Title = "One or more validation errors occurred.",
                Instance = instance,
            },

            InvalidCredentialsException => Problem(
                StatusCodes.Status401Unauthorized, "Authentication failed", exception.Message, instance),

            UnauthorizedAccessException => Problem(
                StatusCodes.Status401Unauthorized, "Not authenticated",
                "A valid access token is required.", instance),

            ForbiddenException => Problem(
                StatusCodes.Status403Forbidden, "Forbidden", exception.Message, instance),

            NotFoundException => Problem(
                StatusCodes.Status404NotFound, "Resource not found", exception.Message, instance),

            ConflictException => Problem(
                StatusCodes.Status409Conflict, "Conflict", exception.Message, instance),

            DomainException => Problem(
                StatusCodes.Status409Conflict, "Operation not allowed", exception.Message, instance),

            GoneException => Problem(
                StatusCodes.Status410Gone, "No longer available", exception.Message, instance),

            TooManyRequestsException => Problem(
                StatusCodes.Status429TooManyRequests, "Too many requests", exception.Message, instance),

            // Nothing internal is echoed back to the caller; the detail goes to the log instead.
            _ => Problem(
                StatusCodes.Status500InternalServerError, "Unexpected error",
                "An unexpected error occurred while processing the request.", instance),
        };
    }

    private static ProblemDetails Problem(int status, string title, string detail, string? instance) =>
        new()
        {
            Status = status,
            Title = title,
            Detail = detail,
            Instance = instance,
        };
}
