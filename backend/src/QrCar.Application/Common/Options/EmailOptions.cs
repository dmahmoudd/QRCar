namespace QrCar.Application.Common.Options;

public class EmailOptions
{
    public const string SectionName = "Email";

    public string Host { get; set; } = string.Empty;

    public int Port { get; set; } = 587;

    public bool EnableSsl { get; set; } = true;

    public string UserName { get; set; } = string.Empty;

    public string Password { get; set; } = string.Empty;

    public string From { get; set; } = "noreply@tala3ny.app";

    public string FromName { get; set; } = "Tala3ny";
}
