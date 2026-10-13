using System.Net;
using System.Net.Mail;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using QrCar.Application.Common.Interfaces;
using QrCar.Application.Common.Options;

namespace QrCar.Infrastructure.Email;

public sealed class SmtpEmailSender : IEmailSender
{
    private readonly EmailOptions _options;
    private readonly ILogger<SmtpEmailSender> _logger;

    public SmtpEmailSender(IOptions<EmailOptions> options, ILogger<SmtpEmailSender> logger)
    {
        _options = options.Value;
        _logger = logger;
    }

    public bool IsConfigured => !string.IsNullOrWhiteSpace(_options.Host);

    public async Task SendAsync(
        string toEmail,
        string subject,
        string textBody,
        CancellationToken cancellationToken = default)
    {
        if (!IsConfigured)
        {
            _logger.LogInformation(
                "Email is not configured. Would send to {To}: {Subject}\n{Body}",
                toEmail,
                subject,
                textBody);
            return;
        }

        using var message = new MailMessage
        {
            From = new MailAddress(_options.From, _options.FromName),
            Subject = subject,
            Body = textBody,
        };
        message.To.Add(toEmail);

        using var client = new SmtpClient(_options.Host, _options.Port)
        {
            EnableSsl = _options.EnableSsl,
            Credentials = string.IsNullOrWhiteSpace(_options.UserName)
                ? CredentialCache.DefaultNetworkCredentials
                : new NetworkCredential(_options.UserName, _options.Password),
        };

        await client.SendMailAsync(message, cancellationToken);
    }
}
