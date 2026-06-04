import { forwardRef, useId, useState, type InputHTMLAttributes } from "react";
import { Eye, EyeOff, type LucideIcon } from "lucide-react";
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
  const isPassword = props.type === "password";
  const [showPassword, setShowPassword] = useState(false);
  const inputType = isPassword && showPassword ? "text" : props.type;
  const PasswordIcon = showPassword ? EyeOff : Eye;

  return (
    <label className="block space-y-1" htmlFor={inputId}>
      {label ? (
        <div>
          <div className="text-[12px] font-semibold text-(--text-primary)">{label}</div>
          {hint ? <div className="mt-0.5 text-[11px] leading-4 text-(--text-muted)">{hint}</div> : null}
        </div>
      ) : null}
      <div className="relative">
        {Icon ? <Icon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-(--text-muted)" /> : null}
        <input
          id={inputId}
          ref={ref}
          className={cn(
            "orion-input h-9 w-full rounded-lg border bg-(--surface-2) px-3 text-[13px] text-(--text-primary) outline-none transition placeholder:text-(--text-muted) focus:border-(--accent-soft) focus:ring-2 focus:ring-(--accent-surface)",
            Icon && "pl-9",
            isPassword && "pr-11",
            className,
          )}
          {...props}
          type={inputType}
        />
        {isPassword ? (
          <button
            type="button"
            className="absolute right-2 top-1/2 inline-flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-(--text-muted) transition hover:bg-white/8 hover:text-(--text-primary) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--accent-surface)"
            aria-label={showPassword ? "Hide password" : "Show password"}
            onClick={(event) => {
              event.preventDefault();
              setShowPassword((current) => !current);
            }}
          >
            <PasswordIcon className="size-4" />
          </button>
        ) : null}
      </div>
    </label>
  );
});
