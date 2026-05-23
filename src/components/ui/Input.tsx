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
    <label className="block space-y-2" htmlFor={inputId}>
      {label ? (
        <div>
          <div className="text-sm font-semibold text-[var(--text-primary)]">{label}</div>
          {hint ? <div className="mt-1 text-xs text-[var(--text-muted)]">{hint}</div> : null}
        </div>
      ) : null}
      <div className="relative">
        {Icon ? <Icon className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-[var(--text-muted)]" /> : null}
        <input
          id={inputId}
          ref={ref}
          className={cn(
            "h-12 w-full rounded-2xl border bg-[var(--surface-2)] px-4 text-sm text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-muted)] focus:border-[var(--accent-soft)] focus:ring-4 focus:ring-[var(--accent-surface)]",
            Icon && "pl-11",
            className,
          )}
          {...props}
        />
      </div>
    </label>
  );
});
