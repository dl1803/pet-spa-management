"use client";


import { useMutation } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { ErrorAlert } from "@/components/feedback/error-alert";
import { AuthLayout } from "@/components/layout/auth-layout";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { AuthAlert } from "@/features/auth/components/auth-alert";
import { AuthSwitchLink } from "@/features/auth/components/auth-switch-link";
import {
  getSafeNextPath,
  isLoginRejectedError,
  LOGIN_DEFAULT_VALUES,
  LOGIN_FAILED_MESSAGE,
  LOGIN_WRONG_WEB_MESSAGE,
  toLoginRequest,
  validateLoginPhone,
  type LoginFormValues,
} from "@/features/auth/forms";
import { mockLogin } from "@/features/auth/mock-auth";
import { ROUTES } from "@/lib/routes";
import { STORE_HOTLINE } from "@/lib/store-info";
import { validatePasswordRequired } from "@/lib/validation";

export function LoginScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = getSafeNextPath(searchParams.get("next"));
  const [isWrongWeb, setIsWrongWeb] = useState(false);
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
  const { mutate, isPending, error } = useMutation({ mutationFn: mockLogin });

  function onSubmit(values: LoginFormValues) {
    if (isPending) return;
    setIsWrongWeb(false);

    mutate(toLoginRequest(values), {
      onSuccess: ({ role }) => {
        if (role !== "Customer") {
          setIsWrongWeb(true);
          return;
        }
        router.replace(nextPath ?? ROUTES.home);
      },
    });
  }

  return (
    <AuthLayout
      heading="Chào mừng bạn quay lại. Bé nhà mình hôm nay thế nào?"
      description="Đăng nhập để xem lịch hẹn, xác nhận chi phí khi cần và nhận thông báo từ cửa hàng."
      species={["Cat", "Dog"]}
    >
      <h1 className="text-[26px] leading-[34px]">Đăng nhập</h1>
      <p className="mt-1 text-muted">Dùng số điện thoại bạn đã đăng ký.</p>

      {isWrongWeb && <AuthAlert className="mt-4">{LOGIN_WRONG_WEB_MESSAGE}</AuthAlert>}
      {error !== null &&
        (isLoginRejectedError(error) ? (
          <AuthAlert className="mt-4">{LOGIN_FAILED_MESSAGE}</AuthAlert>
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

        <p className="text-center text-muted">
          Chưa có tài khoản? <AuthSwitchLink href={ROUTES.register}>Đăng ký</AuthSwitchLink>
        </p>
        <p className="text-center text-xs text-muted">
          Cần hỗ trợ tài khoản? Gọi hotline <span className="font-semibold tabular-nums">{STORE_HOTLINE}</span>
        </p>
      </form>
    </AuthLayout>
  );
}

