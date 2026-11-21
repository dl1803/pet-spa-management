namespace PetSpa.Application.Ports;

public interface IPhotoStorage
{
    Task UploadAsync(string storageKey, Stream content, string contentType, CancellationToken ct = default);

    Task<IReadOnlyList<string>> CreateTemporaryUrlsAsync(
        IReadOnlyList<string> storageKeys, TimeSpan lifetime, CancellationToken ct = default);

    Task DeleteAsync(string storageKey, CancellationToken ct = default);
}
