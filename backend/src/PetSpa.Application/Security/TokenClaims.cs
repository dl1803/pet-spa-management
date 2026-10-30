namespace PetSpa.Application.Security;

// Tên claim trong access token. Token chỉ chứa UserId và Role.
public static class TokenClaims
{
    public const string UserId = "sub";
    public const string Role = "role";
}

