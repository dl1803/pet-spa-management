"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { useId } from "react";
import { useForm } from "react-hook-form";
import { Alert } from "@/components/feedback/alert";
import { ErrorAlert } from "@/components/feedback/error-alert";
import { AuthLayout } from "@/components/layout/auth-layout";
import { Button } from "@/components/ui/button";
import { Field, describedBy } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  isLoginRejectedError,
  isWrongWebError,
  LOGIN_DEFAULT_VALUES,
  toLoginRequest,
  validateLoginPassword,
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

// MW-01 Đăng nhập web quản lý – UI-Screens.md
export function LoginScreen() {
  const id = useId();
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

  const phoneId = `${id}-phone`;
  const passwordId = `${id}-password`;

  function onSubmit(values: LoginFormValues) {
    if (isPending) return;
    mutate(toLoginRequest(values), {
      onSuccess: () => router.replace(getLandingPath(next)),
    });
  }

  return (
    <AuthLayout
      heading="Điều hành cửa hàng, từ lịch hẹn đến chuồng và nhân viên."
      description="Xác nhận lịch, phân công nhân viên spa, gán chuồng, theo dõi tiến độ và thanh toán của cả cửa hàng."
      species={["GuineaPig", "Cat", "Dog"]}
    >
      <h1 className="text-[26px] leading-[34px]">Đăng nhập quản lý</h1>
      <p className="mt-1 text-muted">Dùng số điện thoại và mật khẩu của tài khoản quản lý.</p>

      {sessionExpired && error === null && (
        <Alert tone="info" className="mt-4">
          {SESSION_EXPIRED_MESSAGE}
        </Alert>
      )}
      {error !== null &&
        (isLoginRejectedError(error) ? (
          <Alert tone="danger" className="mt-4">{LOGIN_FAILED_MESSAGE}</Alert>
        ) : isWrongWebError(error) ? (
          <Alert tone="danger" className="mt-4">{LOGIN_WRONG_WEB_MESSAGE}</Alert>
        ) : (
          <ErrorAlert error={error} className="mt-4" />
        ))}

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-6 flex flex-col gap-4">
        <Field id={phoneId} label="Số điện thoại" error={errors.phone?.message}>
          <Input
            id={phoneId}
            prefixIcon="phone"
            type="tel"
            inputMode="tel"
            autoComplete="username"
            aria-invalid={errors.phone ? true : undefined}
            aria-describedby={describedBy(phoneId, { hasError: Boolean(errors.phone) })}
            {...register("phone", { validate: validateLoginPhone })}
          />
        </Field>

        <Field id={passwordId} label="Mật khẩu" error={errors.password?.message}>
          <Input
            id={passwordId}
            prefixIcon="key"
            type="password"
            autoComplete="current-password"
            aria-invalid={errors.password ? true : undefined}
            aria-describedby={describedBy(passwordId, { hasError: Boolean(errors.password) })}
            {...register("password", { validate: validateLoginPassword })}
          />
        </Field>

        <Button type="submit" size="lg" disabled={isPending} aria-busy={isPending || undefined}>
          {isPending ? "Đang gửi…" : "Đăng nhập"}
        </Button>
      </form>
    </AuthLayout>
  );
}
