"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { ErrorAlert } from "@/components/feedback/error-alert";
import { useToast } from "@/components/feedback/toast";
import { Icon } from "@/components/icons";
import { PageHeader } from "@/components/layout/page-header";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card, CardBody, CardFooter, CardHeader } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ProfileSummary } from "@/features/profile/components/profile-summary";
import {
  DUPLICATE_CONTACT_MESSAGE,
  isDuplicateContactError,
  isUnauthenticatedError,
  PHONE_HINT,
  PROFILE_SAVED_MESSAGE,
  toProfileFormValues,
  toUpdateMeRequest,
  type ProfileFormValues,
} from "@/features/profile/forms";
import { mockGetMe, mockUpdateMe, PROFILE_QUERY_KEY } from "@/features/profile/mock-profile";
import type { Me } from "@/lib/api/types";
import { MOCK_PETS } from "@/lib/mock-data";
import { ROUTES, withQuery } from "@/lib/routes";
import { validateFullName, validateOptionalEmail, validatePhone } from "@/lib/validation";

const TITLE = "Hồ sơ cá nhân";
const DESCRIPTION = "Thông tin liên hệ cửa hàng dùng khi cần báo cho bạn.";
const LAYOUT_CLASS = "grid grid-cols-[minmax(0,1fr)_360px] items-start gap-6 max-[1180px]:grid-cols-1";
const PHONE_HINT_ID = "profile-phone-hint";
const LOGIN_REDIRECT_PATH = withQuery(ROUTES.login, { next: ROUTES.profile });

function ProfileSkeleton() {
  return (
    <div role="status" aria-busy="true" className={LAYOUT_CLASS}>
      <span className="sr-only">Đang tải hồ sơ cá nhân…</span>
      <Card>
        <CardBody>
          <Skeleton className="h-6 w-44 rounded-[10px]" />
          <div className="mt-6 flex flex-col gap-4">
            <Skeleton className="h-[42px] rounded-[10px]" />
            <div className="grid grid-cols-2 gap-4 max-[640px]:grid-cols-1">
              <Skeleton className="h-[42px] rounded-[10px]" />
              <Skeleton className="h-[42px] rounded-[10px]" />
            </div>
          </div>
        </CardBody>
      </Card>
      <Card>
        <CardBody>
          <div className="flex items-center gap-3.5">
            <Skeleton className="size-14 rounded-full" />
            <Skeleton className="h-5 w-32 rounded-[10px]" />
          </div>
          <Skeleton className="mt-6 h-5 rounded-[10px]" />
        </CardBody>
      </Card>
    </div>
  );
}

function ProfileContent({ me }: { me: Me }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { showSuccess } = useToast();
  const {
    register,
    handleSubmit,
    setError,
    reset: resetForm,
    formState: { errors },
  } = useForm<ProfileFormValues>({
    mode: "onTouched",
    reValidateMode: "onChange",
    shouldFocusError: true,
    defaultValues: toProfileFormValues(me),
  });
  const {
    mutate,
    isPending,
    error,
    reset: resetMutation,
  } = useMutation({
    mutationFn: mockUpdateMe,
    onSuccess: async (_result, request) => {
      resetForm({
        fullName: request.fullName ?? "",
        phone: request.phone ?? "",
        email: request.email ?? "",
      });
      showSuccess(PROFILE_SAVED_MESSAGE);
      await queryClient.invalidateQueries({ queryKey: PROFILE_QUERY_KEY });
    },
    onError: (failure) => {
      if (isUnauthenticatedError(failure)) {
        router.replace(LOGIN_REDIRECT_PATH);
        return;
      }
      if (isDuplicateContactError(failure)) {
        setError("phone", { type: "server", message: DUPLICATE_CONTACT_MESSAGE }, { shouldFocus: true });
      }
    },
  });

  const showAlert = error !== null && !isDuplicateContactError(error) && !isUnauthenticatedError(error);

  function onSubmit(values: ProfileFormValues) {
    if (isPending) return;
    mutate(toUpdateMeRequest(values));
  }

  function onCancel() {
    resetForm(toProfileFormValues(me));
    resetMutation();
  }

  return (
    <div className={LAYOUT_CLASS}>
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <Card>
          <CardHeader title="Thông tin của bạn" />
          <CardBody>
            {showAlert && <ErrorAlert error={error} className="mb-4" />}
            <div className="flex flex-col gap-4">
              <Field id="profile-full-name" label="Họ tên" required error={errors.fullName?.message}>
                {(control) => (
                  <Input {...control} autoComplete="name" {...register("fullName", { validate: validateFullName })} />
                )}
              </Field>

              <div className="grid grid-cols-2 items-start gap-4 max-[640px]:grid-cols-1">
                <div>
                  <Field id="profile-phone" label="Số điện thoại" required error={errors.phone?.message}>
                    {(control) => (
                      <Input
                        {...control}
                        aria-describedby={[control["aria-describedby"], PHONE_HINT_ID].filter(Boolean).join(" ")}
                        type="tel"
                        inputMode="tel"
                        autoComplete="tel"
                        {...register("phone", { validate: validatePhone })}
                      />
                    )}
                  </Field>
                  <p id={PHONE_HINT_ID} className="mt-1.5 text-xs text-muted">
                    {PHONE_HINT}
                  </p>
                </div>

                <Field id="profile-email" label="Email" optional error={errors.email?.message}>
                  {(control) => (
                    <Input
                      {...control}
                      type="email"
                      autoComplete="email"
                      {...register("email", { validate: validateOptionalEmail })}
                    />
                  )}
                </Field>
              </div>
            </div>
          </CardBody>
          <CardFooter className="items-center justify-between">
            <Button variant="secondary" onClick={onCancel} disabled={isPending}>
              Hủy bỏ
            </Button>
            <Button type="submit" loading={isPending}>
              Lưu thay đổi
            </Button>
          </CardFooter>
        </Card>
      </form>

      <aside className="flex flex-col gap-3">
        <ProfileSummary fullName={me.fullName ?? ""} petCount={MOCK_PETS.length} />
        <ButtonLink href={ROUTES.login} variant="secondary" block>
          <Icon name="logout" />
          Đăng xuất
        </ButtonLink>
      </aside>
    </div>
  );
}

export function ProfileScreen() {
  const router = useRouter();
  const { data, error, isFetching, refetch } = useQuery({ queryKey: PROFILE_QUERY_KEY, queryFn: mockGetMe });
  const isUnauthenticated = error !== null && isUnauthenticatedError(error);
  const showLoadError = error !== null && !isUnauthenticated;

  useEffect(() => {
    if (isUnauthenticated) router.replace(LOGIN_REDIRECT_PATH);
  }, [isUnauthenticated, router]);

  return (
    <>
      <PageHeader title={TITLE} description={DESCRIPTION} />
      {showLoadError ? (
        <div>
          <ErrorAlert error={error} />
          <div className="mt-4">
            <Button variant="secondary" onClick={() => void refetch()} disabled={isFetching}>
              Thử lại
            </Button>
          </div>
        </div>
      ) : data === undefined || isUnauthenticated ? (
        <ProfileSkeleton />
      ) : (
        <ProfileContent me={data} />
      )}
    </>
  );
}

