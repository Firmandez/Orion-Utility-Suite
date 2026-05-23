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
    <section className={cn("surface-panel-alt p-5 sm:p-6", className)}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="inline-flex size-11 items-center justify-center rounded-2xl border border-[var(--accent-soft)] bg-[var(--accent-surface)] text-[var(--accent-strong)]">
            <Icon className="size-5" />
          </div>
          <h3 className="mt-4 text-lg font-semibold text-[var(--text-primary)]">{title}</h3>
          <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{description}</p>
        </div>
        {actions ? <div className="shrink-0">{actions}</div> : null}
      </div>
      <div className="mt-6">{children}</div>
    </section>
  );
}
