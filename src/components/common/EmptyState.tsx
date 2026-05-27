import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="surface-panel-alt flex flex-col items-center justify-center gap-3 p-6 text-center">
      <div className="flex size-12 items-center justify-center rounded-2xl bg-[var(--accent-surface)] text-[var(--accent-strong)]">
        <Icon className="size-5" />
      </div>
      <div className="max-w-md">
        <div className="text-sm font-semibold text-[var(--text-primary)]">{title}</div>
        <p className="mt-1.5 text-sm leading-5 text-[var(--text-secondary)]">{description}</p>
      </div>
      {action}
    </div>
  );
}
