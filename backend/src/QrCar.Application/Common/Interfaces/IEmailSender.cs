namespace QrCar.Application.Common.Interfaces;

public interface IEmailSender
{
    bool IsConfigured { get; }

    Task SendAsync(
        string toEmail,
        string subject,
        string textBody,
        CancellationToken cancellationToken = default);
}
