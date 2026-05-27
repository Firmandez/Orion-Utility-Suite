import { LoaderCircle, type LucideIcon } from "lucide-react";
import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "ghost" | "outline";
type ButtonSize = "sm" | "md" | "lg" | "icon";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  leadingIcon?: LucideIcon;
}

const variantClassMap: Record<ButtonVariant, string> = {
  primary:
    "border-transparent bg-[linear-gradient(135deg,var(--accent),var(--accent-strong))] text-white shadow-[0_8px_18px_color-mix(in_srgb,var(--accent-strong)_26%,transparent)] hover:brightness-110",
  secondary:
    "border-(--border-strong) bg-(--surface-3) text-(--text-primary) hover:bg-(--surface-4)",
  ghost: "border-transparent bg-transparent text-(--text-secondary) hover:bg-white/5 hover:text-(--text-primary)",
  outline: "border-(--border-subtle) bg-transparent text-(--text-primary) hover:border-(--accent-soft) hover:bg-white/5",
};

const sizeClassMap: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-xs",
  md: "h-10 px-4 text-sm",
  lg: "h-11 px-5 text-sm",
  icon: "h-10 w-10 px-0",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    className,
    variant = "primary",
    size = "md",
    loading = false,
    leadingIcon: LeadingIcon,
    children,
    disabled,
    ...props
  },
  ref,
) {
  return (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl border font-semibold transition duration-200 outline-none focus-visible:ring-4 focus-visible:ring-(--accent-surface) disabled:cursor-not-allowed disabled:opacity-60",
        variantClassMap[variant],
        sizeClassMap[size],
        className,
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <LoaderCircle className="size-4 animate-spin" /> : LeadingIcon ? <LeadingIcon className="size-4" /> : null}
      {size !== "icon" ? <span>{children}</span> : children}
    </button>
  );
});
