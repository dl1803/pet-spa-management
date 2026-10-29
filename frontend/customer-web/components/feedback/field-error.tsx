import { Icon } from "@/components/icons";

export function FieldError({ id, message }: { id?: string; message?: string }) {
  if (!message) return null;

  return (
    <p id={id} className="mt-1.5 flex items-start gap-1.5 text-xs text-danger">
      <Icon name="alert" className="mt-px size-3.5" />
      {message}
    </p>
  );
}

