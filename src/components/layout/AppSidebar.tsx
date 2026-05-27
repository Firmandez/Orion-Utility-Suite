import { X } from "lucide-react";
import { NavLink } from "react-router-dom";
import orionLogo from "@/assets/orion-logo.png";
import { navGroups } from "@/data/navigation";
import { cn } from "@/lib/utils";
import type { AppBootstrapState } from "@/types/app";

interface AppSidebarProps {
  bootstrap: AppBootstrapState;
  open: boolean;
  onClose: () => void;
}

export function AppSidebar({ bootstrap, open, onClose }: AppSidebarProps) {
  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-40 flex w-[248px] flex-col border-r bg-(--surface-1) p-4 backdrop-blur-2xl transition duration-300 lg:static lg:translate-x-0 lg:bg-transparent",
        open ? "translate-x-0" : "-translate-x-full",
      )}
    >
      <div className="mb-5 flex items-center justify-between gap-3 lg:mb-6">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center overflow-hidden rounded-lg border border-(--accent-soft) bg-(--accent-surface)">
            <img src={orionLogo} alt="Orion Utility Suite" className="size-full object-cover" />
          </div>
          <div className="min-w-0 text-sm font-semibold leading-tight text-(--text-primary)">
            Orion Utility Suite
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-xl border p-2 text-(--text-muted) lg:hidden"
          aria-label="Close sidebar"
        >
          <X className="size-4" />
        </button>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto pr-1">
        {navGroups.map((group) => (
          <div key={group.label}>
            <div className="mb-2 text-xs uppercase tracking-widest text-(--text-muted)">{group.label}</div>
            <div className="space-y-1">
              {group.items.map((item) => {
                const Icon = item.icon;

                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === "/"}
                    onClick={onClose}
                    className={({ isActive }) =>
                      cn(
                        "group flex items-center gap-2.5 rounded-lg border px-2.5 py-2 transition",
                        isActive
                          ? "border-(--accent-soft) bg-(--accent-surface) text-(--text-primary)"
                          : "border-transparent text-(--text-secondary) hover:bg-white/5 hover:text-(--text-primary)",
                      )
                    }
                  >
                    <div className="flex size-7 shrink-0 items-center justify-center rounded-md border border-(--accent-soft) bg-(--accent-surface) text-(--accent-strong)">
                      <Icon className="size-3.5" />
                    </div>
                    <div className="text-sm font-medium">{item.title}</div>
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 px-2 text-xs text-(--text-muted)">
        v{bootstrap.data.version}
      </div>
    </aside>
  );
}
