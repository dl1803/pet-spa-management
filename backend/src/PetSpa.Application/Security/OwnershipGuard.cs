using PetSpa.Domain.Exceptions;

namespace PetSpa.Application.Security;

public static class OwnershipGuard
{
    // BR-16: dữ liệu gắn với một chủ thể chỉ được truy cập khi thuộc sở hữu của người đang đăng nhập.
    // ownerUserId là UserId của chủ dữ liệu; null (ví dụ khách vãng lai không có tài khoản) thì không ai là chủ.
    // Ngoài phạm vi -> 403 FORBIDDEN, không kèm thông tin về dữ liệu (mặc định từ chối).
    public static void EnsureOwner(CurrentUser user, Guid? ownerUserId)
    {
        if (ownerUserId is null || user.UserId != ownerUserId.Value)
            throw new BusinessException(ErrorCodes.Forbidden);
    }
}
