namespace QrCar.Application.Features.Auth.Dtos;

public record RegisterRequest(string FullName, string Email, string Password, string PhoneNumber);

public record LoginRequest(string Email, string Password);

public record AuthUserSummary(Guid Id, string FullName, string Email, string Role);

public record AuthResponse(
    string AccessToken,
    string TokenType,
    DateTime ExpiresAtUtc,
    AuthUserSummary User);

public record ForgotPasswordRequest(string Email);

public record ForgotPasswordResponse(bool Exists, string? ResetToken);

public record ResetPasswordRequest(string Token, string Password);
