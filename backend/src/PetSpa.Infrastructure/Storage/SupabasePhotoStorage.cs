using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json.Serialization;
using PetSpa.Application.Ports;

namespace PetSpa.Infrastructure.Storage;

public sealed class SupabasePhotoStorage : IPhotoStorage
{
    private const string ApiPrefix = "/storage/v1";

    private readonly HttpClient http;
    private readonly string bucket;
    private readonly string origin;

    public SupabasePhotoStorage(HttpClient http, StorageOptions options)
    {
        if (string.IsNullOrWhiteSpace(options.Url)
            || string.IsNullOrWhiteSpace(options.ServiceKey)
            || string.IsNullOrWhiteSpace(options.Bucket)
            || !Uri.TryCreate(options.Url, UriKind.Absolute, out _))
        {
            throw new InvalidOperationException("Thiếu hoặc sai cấu hình Storage__Url, Storage__ServiceKey, Storage__Bucket.");
        }

        this.http = http;
        bucket = options.Bucket;
        origin = options.Url.TrimEnd('/');

        http.BaseAddress = new Uri(origin + ApiPrefix + "/");
        http.DefaultRequestHeaders.Add("apikey", options.ServiceKey);
        http.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", options.ServiceKey);
    }

    public async Task UploadAsync(string storageKey, Stream content, string contentType, CancellationToken ct = default)
    {
        using var body = new StreamContent(content);
        body.Headers.ContentType = new MediaTypeHeaderValue(contentType);

        using var response = await http.PostAsync($"object/{bucket}/{storageKey}", body, ct);
        await EnsureSuccessAsync(response, "tải tệp lên", ct);
    }

    public async Task<IReadOnlyList<string>> CreateTemporaryUrlsAsync(
        IReadOnlyList<string> storageKeys, TimeSpan lifetime, CancellationToken ct = default)
    {
        if (storageKeys.Count == 0) return [];

        using var response = await http.PostAsJsonAsync(
            $"object/sign/{bucket}", new SignRequest((int)lifetime.TotalSeconds, storageKeys), ct);
        await EnsureSuccessAsync(response, "tạo đường dẫn tạm thời", ct);

        var items = await response.Content.ReadFromJsonAsync<List<SignedItem>>(ct) ?? [];
        var signedByPath = new Dictionary<string, string>();
        foreach (var item in items)
        {
            if (item.Path is not null && !string.IsNullOrEmpty(item.SignedUrl))
                signedByPath[item.Path] = item.SignedUrl;
        }

        var urls = new List<string>(storageKeys.Count);
        foreach (var key in storageKeys)
        {
            if (!signedByPath.TryGetValue(key, out var signed))
                throw new InvalidOperationException("Supabase Storage không trả đường dẫn tạm thời cho một tệp được yêu cầu.");

            urls.Add(ToAbsoluteUrl(signed));
        }

        return urls;
    }

    public async Task DeleteAsync(string storageKey, CancellationToken ct = default)
    {
        using var response = await http.DeleteAsync($"object/{bucket}/{storageKey}", ct);
        await EnsureSuccessAsync(response, "xóa tệp", ct);
    }

    private string ToAbsoluteUrl(string signedUrl)
    {
        if (signedUrl.StartsWith(ApiPrefix + "/", StringComparison.Ordinal))
            return origin + signedUrl;

        if (signedUrl.StartsWith("/object/", StringComparison.Ordinal))
            return origin + ApiPrefix + signedUrl;

        throw new InvalidOperationException("Supabase Storage trả đường dẫn tạm thời có định dạng không nhận ra.");
    }

    private static async Task EnsureSuccessAsync(HttpResponseMessage response, string action, CancellationToken ct)
    {
        if (response.IsSuccessStatusCode) return;

        var body = await response.Content.ReadAsStringAsync(ct);
        if (body.Length > 300) body = body[..300];

        throw new InvalidOperationException(
            $"Supabase Storage lỗi khi {action}: HTTP {(int)response.StatusCode}. {body}");
    }

    private sealed record SignRequest(int ExpiresIn, IReadOnlyList<string> Paths);

    private sealed class SignedItem
    {
        [JsonPropertyName("path")]
        public string? Path { get; set; }

        [JsonPropertyName("signedURL")]
        public string? SignedUrl { get; set; }

        [JsonPropertyName("error")]
        public string? Error { get; set; }
    }
}
