import { cn } from "@/lib/utils";

interface ProgressBarProps {
  label?: string;
  value: number;
  showValue?: boolean;
  tone?: "cyan" | "teal" | "amber";
  className?: string;
}

const toneClassMap = {
  cyan: "from-[var(--accent) via-[var(--accent-strong) to-sky-500",
  teal: "from-emerald-400 via-teal-400 to-cyan-500",
  amber: "from-amber-400 via-orange-400 to-rose-500",
};

export function ProgressBar({
  label,
  value,
  showValue = true,
  tone = "cyan",
  className,
}: ProgressBarProps) {
  const safeValue = Math.min(Math.max(Math.round(value), 0), 100);

  return (
    <div className={cn("space-y-2", className)}>
      {label ? (
        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="font-medium text-[var(--text-secondary)">{label}</span>
          {showValue ? <span className="text-xs text-[var(--text-muted)">{safeValue}%</span> : null}
        </div>
      ) : null}
      <div className="h-3 overflow-hidden rounded-full bg-[var(--surface-3)">
        <div
          className={cn("h-full rounded-full bg-gradient-to-r transition-[width] duration-300", toneClassMap[tone])}
          style={{ width: `${safeValue}%` }}
        />
      </div>
    </div>
  );
}
