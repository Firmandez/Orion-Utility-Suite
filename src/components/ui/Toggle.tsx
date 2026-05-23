import { useId } from "react";
import { cn } from "@/lib/utils";

interface ToggleProps {
  label: string;
  hint?: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  className?: string;
}

export function Toggle({ label, hint, checked, onCheckedChange, className }: ToggleProps) {
  const id = useId();

  return (
    <div className={cn("flex items-center justify-between gap-4 rounded-2xl border bg-[var(--surface-2)] p-4", className)}>
      <div>
        <label className="text-sm font-semibold text-[var(--text-primary)]" htmlFor={id}>
          {label}
        </label>
        {hint ? <div className="mt-1 text-xs text-[var(--text-muted)]">{hint}</div> : null}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onCheckedChange(!checked)}
        className={cn(
          "relative inline-flex h-8 w-14 shrink-0 rounded-full border p-1 transition outline-none focus-visible:ring-4 focus-visible:ring-[var(--accent-surface)]",
          checked ? "border-[var(--accent-soft)] bg-[var(--accent-strong)]" : "border-[var(--border-subtle)] bg-[var(--surface-4)]",
        )}
      >
        <span
          className={cn(
            "pointer-events-none absolute left-1 top-1 size-6 rounded-full bg-white shadow-lg transition-transform duration-200",
            checked ? "translate-x-6" : "translate-x-0",
          )}
        />
      </button>
    </div>
  );
}
