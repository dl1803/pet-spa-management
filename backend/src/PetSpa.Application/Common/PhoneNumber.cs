namespace PetSpa.Application.Common;

// Số điện thoại là định danh duy nhất (X-02): AppUser.UserName = Customer.Phone.
public static class PhoneNumber
{
    // Bỏ khoảng trắng, '.', '-', '(', ')'; đầu "+84" đổi thành "0".
    public static string Normalize(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return string.Empty;

        var cleaned = new string(value
            .Where(c => !char.IsWhiteSpace(c) && c is not ('.' or '-' or '(' or ')'))
            .ToArray());

        return cleaned.StartsWith("+84", StringComparison.Ordinal) ? "0" + cleaned[3..] : cleaned;
    }

    // Hợp lệ sau chuẩn hóa: đủ 10 chữ số, bắt đầu bằng 0.
    public static bool IsValid(string? value)
    {
        var phone = Normalize(value);
        return phone.Length == 10 && phone[0] == '0' && phone.All(char.IsAsciiDigit);
    }
}
