import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { ResultRow } from "@/types/app";

interface ResultCardProps {
  title: string;
  description?: string;
  rows: ResultRow[];
  footer?: ReactNode;
  className?: string;
}

export function ResultCard({ title, description, rows, footer, className }: ResultCardProps) {
  return (
    <div className={cn("surface-panel-alt p-5", className)}>
      <div>
        <div className="text-sm font-semibold text-[var(--text-primary)]">{title}</div>
        {description ? <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{description}</p> : null}
      </div>
      <div className="mt-5 space-y-3">
        {rows.map((row) => (
          <div
            key={`${row.label}-${row.value}`}
            className="flex items-start justify-between gap-4 rounded-2xl border bg-black/10 px-4 py-3"
          >
            <div className="text-xs uppercase tracking-[0.16em] text-[var(--text-muted)]">{row.label}</div>
            <div className={cn("text-right text-sm text-[var(--text-primary)]", row.mono && "font-mono")}>{row.value}</div>
          </div>
        ))}
      </div>
      {footer ? <div className="mt-5">{footer}</div> : null}
    </div>
  );
}
