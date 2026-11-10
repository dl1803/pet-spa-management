import type { FormEventHandler } from "react";
import type { UseFormRegisterReturn } from "react-hook-form";
import { FieldError } from "@/components/feedback/field-error";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const SEARCH_INPUT_ID = "customer-search";
const SEARCH_ERROR_ID = "customer-search-error";

type CustomerSearchFormProps = {
  registration: UseFormRegisterReturn;
  error?: string;
  isSearching: boolean;
  onSubmit: FormEventHandler<HTMLFormElement>;
};

// SW-04 vùng 1: ô tìm khách theo số điện thoại. Nhấn Enter hoặc “Tìm khách” đều tìm.
export function CustomerSearchForm({ registration, error, isSearching, onSubmit }: CustomerSearchFormProps) {
  return (
    <Card>
      <CardBody>
        <form role="search" noValidate onSubmit={onSubmit} className="flex items-start gap-3 max-[640px]:flex-col">
          <div className="min-w-0 flex-1 max-[640px]:w-full">
            <label htmlFor={SEARCH_INPUT_ID} className="sr-only">
              Số điện thoại khách hàng
            </label>
            <Input
              id={SEARCH_INPUT_ID}
              prefixIcon="search"
              inputMode="tel"
              autoComplete="off"
              placeholder="Nhập số điện thoại khách hàng"
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? SEARCH_ERROR_ID : undefined}
              {...registration}
            />
            <FieldError id={SEARCH_ERROR_ID} message={error} />
          </div>
          <Button type="submit" variant="secondary" loading={isSearching} loadingText="Đang tìm…">
            Tìm khách
          </Button>
        </form>
      </CardBody>
    </Card>
  );
}

