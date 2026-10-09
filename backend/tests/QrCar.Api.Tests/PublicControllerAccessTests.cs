using System.Text.Json;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using QrCar.Api.Controllers;
using QrCar.Application.Common.Exceptions;
using QrCar.Application.Features.PublicScan;
using QrCar.Application.Features.PublicScan.Dtos;
using Xunit;

namespace QrCar.Api.Tests;

public class PublicControllerAccessTests
{
    private const string Token = "AbcdefghijkLMNOP12345-";
    private const string ScanId = "scan-grant-1";

    [Fact]
    public void GetCarByToken_returns_app_required_payload_with_no_vehicle_fields()
    {
        var controller = CreateController(new FakePublicScanService());

        var result = controller.GetCarByToken($"{Token}?fromApp=true");

        var body = Assert.IsType<PublicBrowserAccessResponse>(
            Assert.IsType<OkObjectResult>(result.Result).Value);
        Assert.True(body.RequiresOfficialApp);

        var json = JsonSerializer.Serialize(
            body,
            new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase });

        Assert.Contains("requiresOfficialApp", json);
        Assert.DoesNotContain("maskedPhone", json, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("whatsapp", json, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("lastLatitude", json, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("lastLongitude", json, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("scanId", json, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void GetCarByToken_has_no_spoofable_client_flag()
    {
        var names = typeof(PublicController)
            .GetMethod(nameof(PublicController.GetCarByToken))!
            .GetParameters()
            .Select(parameter => parameter.Name);

        Assert.DoesNotContain("fromApp", names, StringComparer.OrdinalIgnoreCase);
        Assert.Equal(new[] { "token" }, names);
    }

    [Fact]
    public void GetCarByToken_does_not_call_official_scan_validation()
    {
        var fake = new FakePublicScanService();
        var controller = CreateController(fake);

        controller.GetCarByToken(Token);

        Assert.Equal(0, fake.OfficialScanCalls);
        Assert.Empty(fake.RequestedTokens);
    }

    [Fact]
    public void Token_based_call_and_whatsapp_are_closed()
    {
        var controller = CreateController(new FakePublicScanService());

        Assert.IsType<NotFoundResult>(controller.CallOwnerByToken(Token));
        Assert.IsType<NotFoundResult>(controller.WhatsAppOwnerByToken(Token));
    }

    [Fact]
    public async Task CreateOfficialScan_returns_vehicle_details_only_after_validation()
    {
        var fake = new FakePublicScanService();
        var controller = CreateController(fake);

        var result = await controller.CreateOfficialScan(
            new CreateOfficialScanRequest(Token),
            CancellationToken.None);

        var body = Assert.IsType<OfficialScanResponse>(
            Assert.IsType<OkObjectResult>(result.Result).Value);
        Assert.Equal(ScanId, body.ScanId);
        Assert.Equal("+20 ••• ••• 1234", body.MaskedPhone);
        Assert.Equal(1, fake.OfficialScanCalls);
        Assert.Equal(new[] { Token }, fake.RequestedTokens);
    }

    [Fact]
    public async Task CreateOfficialScan_rejects_unknown_and_revoked_tokens()
    {
        var controller = CreateController(new FakePublicScanService
        {
            ScanException = new NotFoundException("This QR code is not recognised."),
        });

        await Assert.ThrowsAsync<NotFoundException>(() =>
            controller.CreateOfficialScan(new CreateOfficialScanRequest(Token), CancellationToken.None));

        controller = CreateController(new FakePublicScanService
        {
            ScanException = new GoneException("This QR code is no longer active."),
        });

        await Assert.ThrowsAsync<GoneException>(() =>
            controller.CreateOfficialScan(new CreateOfficialScanRequest("rotated-token-value----"), CancellationToken.None));
    }

    [Fact]
    public void CreateOfficialScanRequest_has_no_spoofable_client_flag()
    {
        var names = typeof(CreateOfficialScanRequest).GetProperties().Select(p => p.Name);

        Assert.Equal(new[] { "Token" }, names);
        Assert.DoesNotContain("FromApp", names, StringComparer.OrdinalIgnoreCase);
    }

    [Fact]
    public void Token_based_parking_requests_are_closed()
    {
        var controller = CreateController(new FakePublicScanService());

        Assert.IsType<NotFoundResult>(controller.CreateRequestByToken(Token));
    }

    [Fact]
    public async Task Parking_request_uses_the_issued_scan_id()
    {
        var fake = new FakePublicScanService();
        var controller = CreateController(fake);

        var result = await controller.CreateRequest(
            ScanId,
            new CreateParkingRequestRequest("Blocking", null),
            CancellationToken.None);

        var body = Assert.IsType<ParkingRequestCreatedResponse>(
            Assert.IsType<AcceptedResult>(result.Result).Value);
        Assert.Equal("TRACK1", body.TrackingRef);
        Assert.Equal(ScanId, fake.LastRequestScanId);
    }

    [Fact]
    public async Task Expired_or_unknown_scan_sessions_are_rejected()
    {
        var controller = CreateController(new FakePublicScanService
        {
            PhoneException = new NotFoundException("This QR code is not recognised."),
        });

        await Assert.ThrowsAsync<NotFoundException>(() =>
            controller.CallOwner("expired-or-missing", CancellationToken.None));
    }

    [Fact]
    public async Task Scan_grant_call_uses_the_issued_scan_id_not_the_printed_token()
    {
        var fake = new FakePublicScanService();
        var controller = CreateController(fake);

        var result = await controller.CallOwner(ScanId, CancellationToken.None);

        var page = Assert.IsType<ContentResult>(result);
        Assert.Contains("tel:+201001234567", page.Content);
        Assert.Equal(ScanId, fake.LastPhoneScanId);
    }

    private static PublicController CreateController(IPublicScanService service)
    {
        return new PublicController(service)
        {
            ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext(),
            },
        };
    }

    private sealed class FakePublicScanService : IPublicScanService
    {
        public int OfficialScanCalls { get; private set; }

        public List<string> RequestedTokens { get; } = [];

        public string? LastPhoneScanId { get; private set; }

        public string? LastRequestScanId { get; private set; }

        public Exception? ScanException { get; init; }

        public Exception? PhoneException { get; init; }

        public IReadOnlyList<ParkingReasonOption> GetReasons() => [];

        public PublicBrowserAccessResponse GetBrowserAccess() => new(true);

        public Task<OfficialScanResponse> CreateOfficialScanAsync(
            string publicToken,
            CancellationToken cancellationToken = default)
        {
            OfficialScanCalls++;
            RequestedTokens.Add(publicToken);

            if (ScanException is not null)
            {
                throw ScanException;
            }

            return Task.FromResult(new OfficialScanResponse(
                ScanId,
                "+20 ••• ••• 1234",
                false,
                null,
                null,
                null,
                true));
        }

        public Task<string> GetOwnerPhoneForScanAsync(
            string scanId,
            CancellationToken cancellationToken = default)
        {
            LastPhoneScanId = scanId;
            if (PhoneException is not null)
            {
                throw PhoneException;
            }

            return Task.FromResult("+201001234567");
        }

        public Task<ParkingRequestCreatedResponse> CreateRequestForScanAsync(
            string scanId,
            CreateParkingRequestRequest request,
            string? requesterIp,
            string? userAgent,
            CancellationToken cancellationToken = default)
        {
            LastRequestScanId = scanId;
            return Task.FromResult(new ParkingRequestCreatedResponse(
                "TRACK1",
                DateTime.UtcNow,
                DateTime.UtcNow.AddHours(2)));
        }

        public Task<PublicRequestStatusResponse> GetRequestStatusAsync(
            string trackingRef,
            CancellationToken cancellationToken = default) =>
            throw new NotSupportedException();
    }
}
