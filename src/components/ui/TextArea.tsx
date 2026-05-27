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
    <label className="block space-y-1.5" htmlFor={textAreaId}>
      {label ? (
        <div>
          <div className="text-[13px] font-semibold text-(--text-primary)">{label}</div>
          {hint ? <div className="mt-1 text-xs text-(--text-muted)">{hint}</div> : null}
        </div>
      ) : null}
      <textarea
        id={textAreaId}
        ref={ref}
        className={cn(
          "min-h-[112px] w-full rounded-lg border bg-(--surface-2) px-3.5 py-2.5 text-sm text-(--text-primary) outline-none transition placeholder:text-(--text-muted) focus:border-(--accent-soft) focus:ring-4 focus:ring-(--accent-surface)",
          className,
        )}
        {...props}
      />
    </label>
  );
});
