import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PageSectionProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
}

export function PageSection({ title, description, actions, children, className, contentClassName }: PageSectionProps) {
  return (
    <section className={cn("surface-panel min-w-0 p-3.5 sm:p-4", className)}>
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-(--text-primary)">{title}</h2>
          {description ? <p className="mt-1 max-w-2xl text-xs leading-4 text-(--text-secondary)">{description}</p> : null}
        </div>
        {actions ? <div className="shrink-0">{actions}</div> : null}
      </div>
      <div className={cn("mt-3", contentClassName)}>{children}</div>
    </section>
  );
}
