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
    <div className="surface-panel-alt flex flex-col items-center justify-center gap-4 p-8 text-center">
      <div className="flex size-16 items-center justify-center rounded-3xl bg-[var(--accent-surface)] text-[var(--accent-strong)]">
        <Icon className="size-7" />
      </div>
      <div className="max-w-md">
        <div className="text-lg font-semibold text-[var(--text-primary)]">{title}</div>
        <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{description}</p>
      </div>
      {action}
    </div>
  );
}
