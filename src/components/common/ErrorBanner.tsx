import type { LucideIcon } from "lucide-react";
import { ShieldAlert } from "lucide-react";

interface ErrorBannerProps {
  title: string;
  message: string;
  icon?: LucideIcon;
}

export function ErrorBanner({ title, message, icon: Icon = ShieldAlert }: ErrorBannerProps) {
  return (
    <div className="rounded-xl border border-rose-400/18 bg-rose-500/10 p-3">
      <div className="flex items-start gap-3">
        <Icon className="mt-0.5 size-5 shrink-0 text-rose-300" />
        <div>
          <div className="text-sm font-semibold text-(--text-primary)]">{title}</div>
          <div className="mt-1 text-sm leading-5 text-rose-100/90">{message}</div>
        </div>
      </div>
    </div>
  );
}
