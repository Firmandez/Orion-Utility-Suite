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
    <label className="block space-y-1" htmlFor={selectId}>
      {label ? (
        <div>
          <div className="text-[12px] font-semibold text-(--text-primary)">{label}</div>
          {hint ? <div className="mt-0.5 text-[11px] leading-4 text-(--text-muted)">{hint}</div> : null}
        </div>
      ) : null}
      <div className="relative">
        <select
          id={selectId}
          ref={ref}
          className={cn(
            "h-9 w-full appearance-none rounded-lg border bg-(--surface-2) px-3 pr-9 text-[13px] text-(--text-primary) outline-none transition focus:border-(--accent-soft) focus:ring-2 focus:ring-(--accent-surface)",
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
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-(--text-muted)" />
      </div>
    </label>
  );
});
