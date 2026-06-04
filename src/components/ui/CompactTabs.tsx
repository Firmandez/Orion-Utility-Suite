import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CompactTabItem<T extends string> {
  id: T;
  label: string;
  icon: LucideIcon;
}

interface CompactTabsProps<T extends string> {
  items: CompactTabItem<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}

export function CompactTabs<T extends string>({
  items,
  value,
  onChange,
  className,
}: CompactTabsProps<T>) {
  return (
    <div className={cn("flex min-w-0 max-w-full overflow-x-auto border-b border-(--border-subtle) pb-px", className)}>
      <div className="flex w-max max-w-none gap-1.5">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = value === item.id;

          return (
            <button
              key={item.id}
              type="button"
              aria-pressed={isActive}
              onClick={() => onChange(item.id)}
              className={cn(
                "inline-flex h-9 items-center gap-2 whitespace-nowrap border-b-2 px-3 text-[13px] font-semibold transition outline-none focus-visible:ring-2 focus-visible:ring-(--accent-surface)",
                isActive
                  ? "border-(--accent) bg-(--accent-surface) text-(--text-primary)"
                  : "border-transparent text-(--text-muted) hover:text-(--text-secondary)",
              )}
            >
              <Icon className={cn("size-4", isActive ? "text-(--accent)" : "text-(--text-muted)")} />
              {item.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
