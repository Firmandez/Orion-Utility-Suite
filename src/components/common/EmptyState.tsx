import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn("surface-panel-alt flex flex-col items-center justify-center gap-2.5 p-4 text-center", className)}>
      <div className="flex size-9 items-center justify-center rounded-lg bg-(--accent-surface) text-(--accent-strong)">
        <Icon className="size-4" />
      </div>
      <div className="max-w-sm">
        <div className="text-sm font-semibold text-(--text-primary)">{title}</div>
        <p className="mt-1 text-xs leading-4 text-(--text-secondary)">{description}</p>
      </div>
      {action}
    </div>
  );
}
