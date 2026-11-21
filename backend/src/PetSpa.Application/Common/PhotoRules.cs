namespace PetSpa.Application.Common;

public sealed record PhotoFormat(string ContentType, string Extension);

public static class PhotoRules
{
    public const long MaxFileBytes = 50L * 1024 * 1024;
    public const long MaxRequestBytes = MaxFileBytes + 1024 * 1024;

    public const int HeaderLength = 12;

    private static ReadOnlySpan<byte> JpegSignature => [0xFF, 0xD8, 0xFF];
    private static ReadOnlySpan<byte> PngSignature => [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];
    private static ReadOnlySpan<byte> RiffSignature => [0x52, 0x49, 0x46, 0x46];
    private static ReadOnlySpan<byte> WebpSignature => [0x57, 0x45, 0x42, 0x50];

    public static PhotoFormat? Detect(ReadOnlySpan<byte> header)
    {
        if (header.StartsWith(JpegSignature))
            return new PhotoFormat("image/jpeg", "jpg");

        if (header.StartsWith(PngSignature))
            return new PhotoFormat("image/png", "png");

        if (header.Length >= HeaderLength
            && header[..4].SequenceEqual(RiffSignature)
            && header.Slice(8, 4).SequenceEqual(WebpSignature))
            return new PhotoFormat("image/webp", "webp");

        return null;
    }
}
