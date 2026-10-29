import { QueryClient } from "@tanstack/react-query";
import { toApiError, type ApiError } from "@/lib/api/errors";

declare module "@tanstack/react-query" {
  interface Register {
    defaultError: ApiError;
  }
}

const DEFAULT_QUERY_RETRY = 3;

export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: (failureCount, error) => {
          const { status } = toApiError(error);
          if (status !== null && status >= 400 && status < 500) {
            return false;
          }
          return failureCount < DEFAULT_QUERY_RETRY;
        },
      },
    },
  });
}

