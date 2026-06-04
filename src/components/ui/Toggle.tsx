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
    <div className={cn("flex items-center justify-between gap-3 rounded-lg border bg-(--surface-2) p-2.5", className)}>
      <div>
        <label className="text-[12px] font-semibold text-(--text-primary)" htmlFor={id}>
          {label}
        </label>
        {hint ? <div className="mt-0.5 text-[11px] leading-4 text-(--text-muted)">{hint}</div> : null}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onCheckedChange(!checked)}
        className={cn(
          "relative inline-flex h-6 w-10 shrink-0 rounded-full border p-1 transition outline-none focus-visible:ring-2 focus-visible:ring-(--accent-surface)",
          checked ? "border-(--accent-soft) bg-(--accent-strong)" : "border-(--border-subtle) bg-(--surface-4)",
        )}
      >
        <span
          className={cn(
            "pointer-events-none absolute left-1 top-1 size-4 rounded-full bg-white shadow-lg transition-transform duration-200",
            checked ? "translate-x-4" : "translate-x-0",
          )}
        />
      </button>
    </div>
  );
}
