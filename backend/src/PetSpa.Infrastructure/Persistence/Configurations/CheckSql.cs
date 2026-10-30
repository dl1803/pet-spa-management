namespace PetSpa.Infrastructure.Persistence.Configurations;

internal static class CheckSql
{
    public static string In<TEnum>(string column) where TEnum : struct, Enum
    {
        var values = string.Join(", ", Enum.GetNames<TEnum>().Select(n => $"'{n}'"));
        return $"\"{column}\" IN ({values})";
    }
}

