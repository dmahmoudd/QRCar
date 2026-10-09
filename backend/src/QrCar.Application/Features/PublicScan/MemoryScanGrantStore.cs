using System.Collections.Concurrent;
using System.Security.Cryptography;
using QrCar.Application.Common.Interfaces;

namespace QrCar.Application.Features.PublicScan;

/// <summary>
/// Process-local scan grants. This is not app attestation — anyone who can POST a token
/// still receives a grant. It only stops ordinary GET/POST access via the printed sticker URL.
/// </summary>
public sealed class MemoryScanGrantStore : IScanGrantStore
{
    public static readonly TimeSpan DefaultLifetime = TimeSpan.FromMinutes(10);

    private readonly ConcurrentDictionary<string, Entry> _entries = new(StringComparer.Ordinal);
    private readonly IDateTimeProvider _clock;
    private readonly TimeSpan _lifetime;

    public MemoryScanGrantStore(IDateTimeProvider clock, TimeSpan? lifetime = null)
    {
        _clock = clock;
        _lifetime = lifetime ?? DefaultLifetime;
    }

    public string Issue(string publicToken, ScanGrantOperations operations)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(publicToken);

        if (operations == ScanGrantOperations.None)
        {
            throw new ArgumentOutOfRangeException(nameof(operations));
        }

        PruneExpired();

        var scanId = Convert.ToHexString(RandomNumberGenerator.GetBytes(16)).ToLowerInvariant();
        _entries[scanId] = new Entry(publicToken, operations, _clock.UtcNow.Add(_lifetime));
        return scanId;
    }

    public bool TryGet(string scanId, ScanGrantOperations required, out string publicToken)
    {
        publicToken = string.Empty;

        if (string.IsNullOrWhiteSpace(scanId) || required == ScanGrantOperations.None)
        {
            return false;
        }

        if (!_entries.TryGetValue(scanId, out var entry))
        {
            return false;
        }

        if (_clock.UtcNow > entry.ExpiresAtUtc)
        {
            _entries.TryRemove(scanId, out _);
            return false;
        }

        if ((entry.Operations & required) != required)
        {
            return false;
        }

        publicToken = entry.PublicToken;
        return true;
    }

    private void PruneExpired()
    {
        var now = _clock.UtcNow;
        foreach (var pair in _entries)
        {
            if (now > pair.Value.ExpiresAtUtc)
            {
                _entries.TryRemove(pair.Key, out _);
            }
        }
    }

    private sealed record Entry(string PublicToken, ScanGrantOperations Operations, DateTime ExpiresAtUtc);
}
