import { AlertTriangle, CheckCircle2, ShieldCheck, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function ValidationPanel({ errors, warnings }: { errors: string[]; warnings: string[] }) {
  if (errors.length === 0 && warnings.length === 0) {
    return (
      <div className="rounded-xl border border-emerald-400/18 bg-emerald-500/10 p-3">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-300" />
          <div>
            <div className="text-sm font-semibold text-(--text-primary)">QR content ready</div>
            <div className="mt-1 text-xs leading-4 text-(--text-secondary)">Preview and export are ready.</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      {errors.map((error) => (
        <div key={error} className="rounded-xl border border-rose-400/18 bg-rose-500/10 p-3 text-sm text-rose-100">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-rose-300" />
            <span className="leading-5">{error}</span>
          </div>
        </div>
      ))}
      {warnings.map((warning) => (
        <div key={warning} className="rounded-xl border border-amber-400/18 bg-amber-500/10 p-3 text-sm text-amber-100">
          <div className="flex items-start gap-2.5">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-amber-300" />
            <span className="leading-5">{warning}</span>
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
    <div className="surface-panel-alt p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[12px] font-semibold text-(--text-primary)">{label}</div>
          <div className="mt-0.5 text-[11px] leading-4 text-(--text-muted)">{hint}</div>
        </div>
        <div className="rounded-full border px-2.5 py-1 text-xs font-medium text-(--text-secondary)">{value}</div>
      </div>
      <div className="mt-3 flex items-center gap-3">
        <label
          className="flex size-9 cursor-pointer items-center justify-center overflow-hidden rounded-lg border bg-(--surface-3)"
          style={{ backgroundColor: value }}
        >
          <input type="color" value={value} onChange={(event) => onChange(event.target.value.toUpperCase())} className="sr-only" />
          <span className="sr-only">{label}</span>
        </label>
        <div className="text-xs text-(--text-secondary)">Click swatch to choose color.</div>
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
    <div className={cn("surface-panel-alt p-3", disabled && "opacity-60")}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[12px] font-semibold text-(--text-primary)">{label}</div>
          <div className="mt-0.5 text-[11px] leading-4 text-(--text-muted)">{hint}</div>
        </div>
        <div className="rounded-full border px-2.5 py-1 text-xs font-medium text-(--text-secondary)">
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
        className="mt-3 h-2 w-full cursor-pointer appearance-none rounded-full bg-white/10 disabled:cursor-not-allowed"
        style={{ accentColor: "var(--accent-strong)" }}
      />
      <div className="mt-2 flex items-center justify-between text-[10px] uppercase tracking-widest text-(--text-muted)">
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
    cyan: "border border-(--accent-soft) bg-(--accent-surface) text-(--accent-strong)",
    emerald: "bg-emerald-500/10 text-emerald-300",
    amber: "bg-amber-500/10 text-amber-300",
  };

  return (
    <div className="rounded-lg border bg-black/10 p-3">
      <div className="flex items-start gap-3">
        <div className={cn("flex size-8 items-center justify-center rounded-lg", toneClassMap[tone])}>
          <Icon className="size-4" />
        </div>
        <div>
          <div className="text-sm font-semibold text-(--text-primary)">{title}</div>
          <div className="mt-1 text-xs leading-4 text-(--text-secondary)">{description}</div>
        </div>
      </div>
    </div>
  );
}
