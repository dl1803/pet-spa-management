namespace PetSpa.Infrastructure.Storage;

public sealed class StorageOptions
{
    public string Url { get; set; } = string.Empty;
    public string ServiceKey { get; set; } = string.Empty;
    public string Bucket { get; set; } = string.Empty;
}
