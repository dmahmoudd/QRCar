namespace QrCar.Application.Common.Interfaces;

public interface ICurrentUser
{
    Guid? UserId { get; }

    bool IsAuthenticated { get; }

    /// <summary>Returns the caller's id, or throws if the request is not authenticated.</summary>
    Guid RequireUserId();
}
