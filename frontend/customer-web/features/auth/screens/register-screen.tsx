"use client";


import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { ErrorAlert } from "@/components/feedback/error-alert";
import { useToast } from "@/components/feedback/toast";
import { AuthLayout } from "@/components/layout/auth-layout";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { AuthSwitchLink } from "@/features/auth/components/auth-switch-link";
import {
  DUPLICATE_PHONE_MESSAGE,
  isDuplicateContactError,
  REGISTER_DEFAULT_VALUES,
  REGISTER_SUCCESS_MESSAGE,
  toRegisterRequest,
  validateConfirmPassword,
  type RegisterFormValues,
} from "@/features/auth/forms";
import { useRegister } from "@/lib/queries/auth";
import { ROUTES } from "@/lib/routes";
import { validateFullName, validateOptionalEmail, validatePasswordRequired, validatePhone } from "@/lib/validation";

export function RegisterScreen() {
  const router = useRouter();
  const { showSuccess } = useToast();
  const {
    register,
    handleSubmit,
    setError,
    getValues,
    trigger,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    mode: "onTouched",
    reValidateMode: "onChange",
    shouldFocusError: true,
    defaultValues: REGISTER_DEFAULT_VALUES,
  });
  const { mutate, isPending, error } = useRegister();

  const showAlert = error !== null && !isDuplicateContactError(error);

  function onSubmit(values: RegisterFormValues) {
    if (isPending) return;

    mutate(toRegisterRequest(values), {
      onSuccess: () => {
        showSuccess(REGISTER_SUCCESS_MESSAGE);
        router.replace(ROUTES.login);
      },
      onError: (failure) => {
        if (isDuplicateContactError(failure)) {
          setError("phone", { type: "server", message: DUPLICATE_PHONE_MESSAGE }, { shouldFocus: true });
        }
      },
    });
  }

  return (
    <AuthLayout
      heading="Đặt lịch tắm, cắt tỉa hay gửi bé ở lại, chỉ vài bước trên web."
      description="Theo dõi trạng thái lịch hẹn, xem ảnh trước và sau khi chăm sóc, thanh toán trực tuyến khi bé đã xong."
      species={["Dog", "Cat", "Rabbit", "GuineaPig"]}
    >
      <h1 className="text-[26px] leading-[34px]">Tạo tài khoản</h1>
      <p className="mt-1 text-muted">Số điện thoại sẽ là tên đăng nhập của bạn.</p>

      {showAlert && <ErrorAlert error={error} className="mt-4" />}

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-6 flex flex-col gap-4">
        <Field id="register-full-name" label="Họ tên" required error={errors.fullName?.message}>
          {(control) => (
            <Input {...control} autoComplete="name" {...register("fullName", { validate: validateFullName })} />
          )}
        </Field>

        <Field id="register-phone" label="Số điện thoại" required error={errors.phone?.message}>
          {(control) => (
            <Input
              {...control}
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              {...register("phone", { validate: validatePhone })}
            />
          )}
        </Field>

        <Field id="register-email" label="Email" optional error={errors.email?.message}>
          {(control) => (
            <Input
              {...control}
              type="email"
              autoComplete="email"
              {...register("email", { validate: validateOptionalEmail })}
            />
          )}
        </Field>

        <div className="grid grid-cols-2 gap-4 max-[640px]:grid-cols-1">
          <Field id="register-password" label="Mật khẩu" required error={errors.password?.message}>
            {(control) => (
              <Input
                {...control}
                type="password"
                autoComplete="new-password"
                {...register("password", {
                  validate: validatePasswordRequired,
                  // Đổi mật khẩu thì kiểm tra lại ô nhập lại (nếu người dùng đã nhập).
                  onChange: () => {
                    if (getValues("confirmPassword") !== "") void trigger("confirmPassword");
                  },
                })}
              />
            )}
          </Field>

          <Field
            id="register-confirm-password"
            label="Nhập lại mật khẩu"
            required
            error={errors.confirmPassword?.message}
          >
            {(control) => (
              <Input
                {...control}
                type="password"
                autoComplete="new-password"
                {...register("confirmPassword", { validate: validateConfirmPassword })}
              />
            )}
          </Field>
        </div>

        <Button type="submit" size="lg" block loading={isPending}>
          Tạo tài khoản
        </Button>

        <p className="text-center text-muted">
          Đã có tài khoản? <AuthSwitchLink href={ROUTES.login}>Đăng nhập</AuthSwitchLink>
        </p>
      </form>
    </AuthLayout>
  );
}

