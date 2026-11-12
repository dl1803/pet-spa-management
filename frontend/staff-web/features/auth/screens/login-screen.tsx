"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { Alert } from "@/components/feedback/alert";
import { ErrorAlert } from "@/components/feedback/error-alert";
import { AuthLayout } from "@/components/layout/auth-layout";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { AuthAlert } from "@/features/auth/components/auth-alert";
import {
  isLoginRejectedError,
  isWrongWebError,
  LOGIN_DEFAULT_VALUES,
  toLoginRequest,
  validateLoginPhone,
  type LoginFormValues,
} from "@/features/auth/forms";
import {
  LOGIN_FAILED_MESSAGE,
  LOGIN_REASON_EXPIRED,
  LOGIN_WRONG_WEB_MESSAGE,
  SESSION_EXPIRED_MESSAGE,
} from "@/lib/auth/constants";
import { getLandingPath } from "@/lib/auth/paths";
import { useSession } from "@/lib/auth/session-context";
import { validatePasswordRequired } from "@/lib/validation";

export function LoginScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signIn } = useSession();
  const next = searchParams.get("next");
  const sessionExpired = searchParams.get("reason") === LOGIN_REASON_EXPIRED;
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    mode: "onTouched",
    reValidateMode: "onChange",
    shouldFocusError: true,
    defaultValues: LOGIN_DEFAULT_VALUES,
  });
  const { mutate, isPending, error } = useMutation({ mutationFn: signIn });

  function onSubmit(values: LoginFormValues) {
    if (isPending) return;
    mutate(toLoginRequest(values), {
      onSuccess: () => router.replace(getLandingPath(next)),
    });
  }

  return (
    <AuthLayout
      heading="Bắt đầu ca làm việc."
      description="Lễ tân tiếp nhận, thu tiền, trả bé. Nhân viên spa xem lịch được phân công, chụp ảnh và cập nhật tiến độ. Mỗi người chỉ thấy đúng phần việc của mình."
      species={["Dog", "Rabbit"]}
    >
      <h1 className="text-[26px] leading-[34px]">Đăng nhập</h1>
      <p className="mt-1 text-muted">Tài khoản do quản lý cửa hàng cấp.</p>

      {sessionExpired && error === null && (
        <Alert tone="info" className="mt-4">
          {SESSION_EXPIRED_MESSAGE}
        </Alert>
      )}
      {error !== null &&
        (isLoginRejectedError(error) ? (
          <AuthAlert className="mt-4">{LOGIN_FAILED_MESSAGE}</AuthAlert>
        ) : isWrongWebError(error) ? (
          <AuthAlert className="mt-4">{LOGIN_WRONG_WEB_MESSAGE}</AuthAlert>
        ) : (
          <ErrorAlert error={error} className="mt-4" />
        ))}

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-6 flex flex-col gap-4">
        <Field id="login-phone" label="Số điện thoại" error={errors.phone?.message}>
          {(control) => (
            <Input
              {...control}
              prefixIcon="phone"
              type="tel"
              inputMode="tel"
              autoComplete="username"
              {...register("phone", { validate: validateLoginPhone })}
            />
          )}
        </Field>

        <Field id="login-password" label="Mật khẩu" error={errors.password?.message}>
          {(control) => (
            <Input
              {...control}
              prefixIcon="key"
              type="password"
              autoComplete="current-password"
              {...register("password", { validate: validatePasswordRequired })}
            />
          )}
        </Field>

        <Button type="submit" size="lg" block loading={isPending}>
          Đăng nhập
        </Button>

        <p className="text-center text-xs text-muted">Không đăng nhập được? Liên hệ quản lý cửa hàng.</p>
      </form>
    </AuthLayout>
  );
}
