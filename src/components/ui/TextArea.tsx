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
    <label className="block space-y-1" htmlFor={textAreaId}>
      {label ? (
        <div>
          <div className="text-[12px] font-semibold text-(--text-primary)">{label}</div>
          {hint ? <div className="mt-0.5 text-[11px] leading-4 text-(--text-muted)">{hint}</div> : null}
        </div>
      ) : null}
      <textarea
        id={textAreaId}
        ref={ref}
        className={cn(
          "min-h-[92px] w-full rounded-lg border bg-(--surface-2) px-3 py-2 text-[13px] text-(--text-primary) outline-none transition placeholder:text-(--text-muted) focus:border-(--accent-soft) focus:ring-2 focus:ring-(--accent-surface)",
          className,
        )}
        {...props}
      />
    </label>
  );
});
