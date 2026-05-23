import { forwardRef, useId, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  hint?: string;
}

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(function TextArea(
  { id, label, hint, className, ...props },
  ref,
) {
  const fallbackId = useId();
  const textAreaId = id ?? fallbackId;

  return (
    <label className="block space-y-2" htmlFor={textAreaId}>
      {label ? (
        <div>
          <div className="text-sm font-semibold text-[var(--text-primary)]">{label}</div>
          {hint ? <div className="mt-1 text-xs text-[var(--text-muted)]">{hint}</div> : null}
        </div>
      ) : null}
      <textarea
        id={textAreaId}
        ref={ref}
        className={cn(
          "min-h-[136px] w-full rounded-2xl border bg-[var(--surface-2)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-muted)] focus:border-[var(--accent-soft)] focus:ring-4 focus:ring-[var(--accent-surface)]",
          className,
        )}
        {...props}
      />
    </label>
  );
});
