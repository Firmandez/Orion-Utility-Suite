import { ChevronDown } from "lucide-react";
import { forwardRef, useId, type SelectHTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import type { SelectOption } from "@/types/app";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  hint?: string;
  options: SelectOption[];
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { id, label, hint, options, className, ...props },
  ref,
) {
  const fallbackId = useId();
  const selectId = id ?? fallbackId;

  return (
    <label className="block space-y-1.5" htmlFor={selectId}>
      {label ? (
        <div>
          <div className="text-[13px] font-semibold text-(--text-primary)]">{label}</div>
          {hint ? <div className="mt-1 text-xs text-(--text-muted)]">{hint}</div> : null}
        </div>
      ) : null}
      <div className="relative">
        <select
          id={selectId}
          ref={ref}
          className={cn(
            "h-10 w-full appearance-none rounded-lg border bg-(--surface-2)] px-3.5 pr-10 text-sm text-(--text-primary)] outline-none transition focus:border-(--accent-soft)] focus:ring-4 focus:ring-(--accent-surface)]",
            className,
          )}
          {...props}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-4 top-1/2 size-4 -translate-y-1/2 text-(--text-muted)]" />
      </div>
    </label>
  );
});
