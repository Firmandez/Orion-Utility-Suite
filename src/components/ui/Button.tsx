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
    "border-transparent bg-[linear-gradient(135deg,var(--accent),var(--accent-strong))] text-white shadow-[0_14px_30px_color-mix(in_srgb,var(--accent-strong)_38%,transparent)] hover:brightness-110",
  secondary:
    "border-[var(--border-strong)] bg-[var(--surface-3)] text-[var(--text-primary)] hover:bg-[var(--surface-4)]",
  ghost: "border-transparent bg-transparent text-[var(--text-secondary)] hover:bg-white/5 hover:text-[var(--text-primary)]",
  outline: "border-[var(--border-subtle)] bg-transparent text-[var(--text-primary)] hover:border-[var(--accent-soft)] hover:bg-white/5",
};

const sizeClassMap: Record<ButtonSize, string> = {
  sm: "h-10 px-4 text-sm",
  md: "h-12 px-5 text-sm",
  lg: "h-14 px-6 text-[15px]",
  icon: "h-11 w-11 px-0",
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
        "inline-flex items-center justify-center gap-2 rounded-2xl border font-semibold transition duration-200 outline-none focus-visible:ring-4 focus-visible:ring-[var(--accent-surface)] disabled:cursor-not-allowed disabled:opacity-60",
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
