"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import { Icon } from "@/components/icons";
import { getErrorMessage } from "@/lib/api/errors";

const SUCCESS_TOAST_MS = 3400;

type ToastItem = { id: number; type: "success" | "error"; message: string };

type ToastApi = {
  showSuccess: (message: string) => void;
  showError: (errorOrMessage: unknown) => void;
};

const ToastContext = createContext<ToastApi | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((items) => items.filter((item) => item.id !== id));
  }, []);

  const api = useMemo<ToastApi>(
    () => ({
      showSuccess(message) {
        const id = ++nextId.current;
        setToasts((items) => [...items, { id, type: "success", message }]);
        setTimeout(() => dismiss(id), SUCCESS_TOAST_MS);
      },
      showError(errorOrMessage) {
        const id = ++nextId.current;
        const message = typeof errorOrMessage === "string" ? errorOrMessage : getErrorMessage(errorOrMessage);
        setToasts((items) => [...items, { id, type: "error", message }]);
      },
    }),
    [dismiss],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed bottom-5 right-5 z-[200] flex flex-col gap-2.5 max-[640px]:left-4 max-[640px]:right-4"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role={toast.type === "error" ? "alert" : "status"}
            className="pointer-events-auto flex min-w-[260px] max-w-[420px] animate-toast-in items-center gap-2.5 rounded-xl bg-ink px-4 py-3 font-medium text-white shadow-pop max-[640px]:min-w-0 max-[640px]:max-w-none"
          >
            <Icon
              name={toast.type === "error" ? "x-circle" : "check-circle"}
              className={`size-[18px] ${toast.type === "error" ? "text-[#FF9B8F]" : "text-[#7FD6A0]"}`}
            />
            <span className="grow">{toast.message}</span>
            {toast.type === "error" && (
              <button
                type="button"
                aria-label="Đóng"
                onClick={() => dismiss(toast.id)}
                className="-mr-1 grid size-7 shrink-0 cursor-pointer place-items-center rounded-lg text-[#CFE0E3] hover:bg-white/10 hover:text-white"
              >
                <Icon name="x" className="size-4" />
              </button>
            )}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast phải dùng bên trong <ToastProvider>.");
  }
  return context;
}

