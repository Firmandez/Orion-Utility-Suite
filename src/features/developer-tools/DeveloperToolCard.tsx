import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface DeveloperToolCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function DeveloperToolCard({
  title,
  description,
  icon: Icon,
  actions,
  children,
  className,
}: DeveloperToolCardProps) {
  return (
    <section className={cn("surface-panel-alt p-4 sm:p-5", className)}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="inline-flex size-10 items-center justify-center rounded-xl border border-[var(--accent-soft)] bg-[var(--accent-surface)] text-[var(--accent-strong)]">
            <Icon className="size-4" />
          </div>
          <h3 className="mt-3 text-base font-semibold text-[var(--text-primary)]">{title}</h3>
          <p className="mt-1.5 text-sm leading-5 text-[var(--text-secondary)]">{description}</p>
        </div>
        {actions ? <div className="shrink-0">{actions}</div> : null}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}
