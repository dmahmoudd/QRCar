using QrCar.Application.Common.Interfaces;
using QrCar.Application.Features.PublicScan;
using Xunit;

namespace QrCar.Application.Tests;

public class MemoryScanGrantStoreTests
{
    private const string Token = "AbcdefghijkLMNOP12345-";

    [Fact]
    public void Issues_a_grant_that_can_be_read_back_for_permitted_operations()
    {
        var clock = new FixedClock();
        var store = new MemoryScanGrantStore(clock);
        var operations = ScanGrantOperations.Contact | ScanGrantOperations.Request;

        var scanId = store.Issue(Token, operations);

        Assert.False(string.IsNullOrWhiteSpace(scanId));
        Assert.True(store.TryGet(scanId, ScanGrantOperations.Contact, out var publicToken));
        Assert.Equal(Token, publicToken);
        Assert.True(store.TryGet(scanId, ScanGrantOperations.Request, out _));
    }

    [Fact]
    public void Grant_stores_only_the_public_token_not_private_vehicle_data()
    {
        var fields = typeof(MemoryScanGrantStore)
            .GetNestedTypes(System.Reflection.BindingFlags.NonPublic)
            .Single(type => type.Name == "Entry")
            .GetProperties()
            .Select(property => property.Name)
            .ToHashSet();

        Assert.Contains("PublicToken", fields);
        Assert.Contains("Operations", fields);
        Assert.Contains("ExpiresAtUtc", fields);
        Assert.DoesNotContain("MaskedPhone", fields);
        Assert.DoesNotContain("Phone", fields, StringComparer.OrdinalIgnoreCase);
        Assert.DoesNotContain("Latitude", fields, StringComparer.OrdinalIgnoreCase);
    }

    [Fact]
    public void Unknown_expired_and_unpermitted_grants_are_rejected()
    {
        var clock = new FixedClock();
        var store = new MemoryScanGrantStore(clock, TimeSpan.FromMinutes(10));
        var scanId = store.Issue(Token, ScanGrantOperations.Contact);

        Assert.False(store.TryGet("missing", ScanGrantOperations.Contact, out _));
        Assert.False(store.TryGet(scanId, ScanGrantOperations.Request, out _));

        clock.UtcNow = clock.UtcNow.AddMinutes(11);

        Assert.False(store.TryGet(scanId, ScanGrantOperations.Contact, out _));
    }

    private sealed class FixedClock : IDateTimeProvider
    {
        public DateTime UtcNow { get; set; } = new(2026, 10, 9, 12, 0, 0, DateTimeKind.Utc);
    }
}
