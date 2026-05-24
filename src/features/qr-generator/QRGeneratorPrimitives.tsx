import { AlertTriangle, CheckCircle2, ShieldCheck, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function ValidationPanel({ errors, warnings }: { errors: string[]; warnings: string[] }) {
  if (errors.length === 0 && warnings.length === 0) {
    return (
      <div className="rounded-3xl border border-emerald-400/18 bg-emerald-500/10 p-4">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-300" />
          <div>
            <div className="text-sm font-semibold text-[var(--text-primary)]">QR content ready</div>
            <div className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">
              QR is ready to preview and export. Change type or styling anytime and the result updates automatically.
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      {errors.map((error) => (
        <div key={error} className="rounded-2xl border border-rose-400/18 bg-rose-500/10 p-4 text-sm text-rose-100">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-rose-300" />
            <span className="leading-6">{error}</span>
          </div>
        </div>
      ))}
      {warnings.map((warning) => (
        <div key={warning} className="rounded-2xl border border-amber-400/18 bg-amber-500/10 p-4 text-sm text-amber-100">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-amber-300" />
            <span className="leading-6">{warning}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

export function ColorSwatchCard({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="surface-panel-alt p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-sm font-semibold text-[var(--text-primary)]">{label}</div>
          <div className="mt-1 text-xs leading-6 text-[var(--text-muted)]">{hint}</div>
        </div>
        <div className="rounded-full border px-3 py-1 text-xs font-medium text-[var(--text-secondary)]">{value}</div>
      </div>
      <div className="mt-4 flex items-center gap-4">
        <label
          className="flex size-14 cursor-pointer items-center justify-center overflow-hidden rounded-2xl border bg-[var(--surface-3)]"
          style={{ backgroundColor: value }}
        >
          <input type="color" value={value} onChange={(event) => onChange(event.target.value.toUpperCase())} className="sr-only" />
          <span className="sr-only">{label}</span>
        </label>
        <div className="text-sm text-[var(--text-secondary)]">Click the swatch to choose the best color.</div>
      </div>
    </div>
  );
}

export function RangeField({
  label,
  hint,
  min,
  max,
  step,
  value,
  suffix,
  disabled = false,
  onChange,
}: {
  label: string;
  hint: string;
  min: number;
  max: number;
  step: number;
  value: number;
  suffix: string;
  disabled?: boolean;
  onChange: (value: number) => void;
}) {
  return (
    <div className={cn("surface-panel-alt p-4", disabled && "opacity-60")}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-[var(--text-primary)]">{label}</div>
          <div className="mt-1 text-xs leading-6 text-[var(--text-muted)]">{hint}</div>
        </div>
        <div className="rounded-full border px-3 py-1 text-xs font-medium text-[var(--text-secondary)]">
          {value}
          {suffix}
        </div>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(Number(event.target.value))}
        className="mt-5 h-2 w-full cursor-pointer appearance-none rounded-full bg-white/10 disabled:cursor-not-allowed"
        style={{ accentColor: "var(--accent-strong)" }}
      />
      <div className="mt-3 flex items-center justify-between text-[11px] uppercase tracking-[0.1em] text-[var(--text-muted)]">
        <span>
          {min}
          {suffix}
        </span>
        <span>
          {max}
          {suffix}
        </span>
      </div>
    </div>
  );
}

export function ReadinessItem({
  icon: Icon,
  title,
  description,
  tone,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  tone: "cyan" | "emerald" | "amber";
}) {
  const toneClassMap = {
    cyan: "border border-[var(--accent-soft)] bg-[var(--accent-surface)] text-[var(--accent-strong)]",
    emerald: "bg-emerald-500/10 text-emerald-300",
    amber: "bg-amber-500/10 text-amber-300",
  };

  return (
    <div className="rounded-2xl border bg-black/10 p-4">
      <div className="flex items-start gap-3">
        <div className={cn("flex size-10 items-center justify-center rounded-2xl", toneClassMap[tone])}>
          <Icon className="size-5" />
        </div>
        <div>
          <div className="text-sm font-semibold text-[var(--text-primary)]">{title}</div>
          <div className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">{description}</div>
        </div>
      </div>
    </div>
  );
}
