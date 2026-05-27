import { forwardRef, useId, type InputHTMLAttributes } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  icon?: LucideIcon;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { id, label, hint, icon: Icon, className, ...props },
  ref,
) {
  const fallbackId = useId();
  const inputId = id ?? fallbackId;

  return (
    <label className="block space-y-1.5" htmlFor={inputId}>
      {label ? (
        <div>
          <div className="text-[13px] font-semibold text-(--text-primary)]">{label}</div>
          {hint ? <div className="mt-1 text-xs text-(--text-muted)]">{hint}</div> : null}
        </div>
      ) : null}
      <div className="relative">
        {Icon ? <Icon className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-(--text-muted)]" /> : null}
        <input
          id={inputId}
          ref={ref}
          className={cn(
            "h-10 w-full rounded-lg border bg-(--surface-2)] px-3.5 text-sm text-(--text-primary)] outline-none transition placeholder:text-(--text-muted)] focus:border-(--accent-soft)] focus:ring-4 focus:ring-(--accent-surface)]",
            Icon && "pl-10",
            className,
          )}
          {...props}
        />
      </div>
    </label>
  );
});
