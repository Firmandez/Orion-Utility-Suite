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
    <section className={cn("surface-panel-alt p-3.5 sm:p-4", className)}>
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="inline-flex size-8 items-center justify-center rounded-lg border border-(--accent-soft) bg-(--accent-surface) text-(--accent-strong)">
            <Icon className="size-4" />
          </div>
          <h3 className="mt-2 text-[15px] font-semibold text-(--text-primary)">{title}</h3>
          <p className="mt-1 text-xs leading-4 text-(--text-secondary)">{description}</p>
        </div>
        {actions ? <div className="shrink-0">{actions}</div> : null}
      </div>
      <div className="mt-3">{children}</div>
    </section>
  );
}
