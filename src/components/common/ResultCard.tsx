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
    <div className={cn("surface-panel-alt p-3", className)}>
      <div>
        <div className="text-[13px] font-semibold text-(--text-primary)">{title}</div>
        {description ? <p className="mt-1 text-xs leading-4 text-(--text-secondary)">{description}</p> : null}
      </div>
      <div className="mt-3 space-y-1.5">
        {rows.map((row) => (
          <div
            key={`${row.label}-${row.value}`}
            className="flex flex-col gap-1 rounded-lg border bg-black/10 px-2.5 py-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4"
          >
            <div className="shrink-0 text-[11px] uppercase tracking-[0.08em] text-(--text-muted)">{row.label}</div>
            <div className={cn("min-w-0 wrap-break-words text-sm text-(--text-primary) sm:text-right", row.mono && "font-mono text-[13px]")}>{row.value}</div>
          </div>
        ))}
      </div>
      {footer ? <div className="mt-3">{footer}</div> : null}
    </div>
  );
}
