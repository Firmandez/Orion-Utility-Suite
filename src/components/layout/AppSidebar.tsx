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
        "fixed inset-y-0 left-0 z-40 flex w-[296px] flex-col border-r bg-[var(--surface-1)] p-5 backdrop-blur-2xl transition duration-300 lg:static lg:translate-x-0 lg:bg-transparent",
        open ? "translate-x-0" : "-translate-x-full",
      )}
    >
      <div className="mb-6 flex items-start justify-between gap-4 lg:mb-8">
        <div>
          <div className="flex items-center gap-3">
            <div className="relative flex size-11 items-center justify-center overflow-hidden rounded-2xl border border-[var(--accent-soft)] bg-[var(--accent-surface)] shadow-[0_12px_24px_color-mix(in_srgb,var(--accent-strong)_18%,transparent)]">
              <img src={orionLogo} alt="Orion Utility Suite logo" className="size-full object-cover" />
              <span className="absolute -right-1 -top-1 size-2 rounded-full bg-[var(--accent-strong)] shadow-[0_0_0_4px_var(--surface-1)]" />
            </div>
            <div>
              <div className="text-sm uppercase tracking-[0.18em] text-[var(--text-muted)]">Utility App</div>
              <div className="text-lg font-semibold text-[var(--text-primary)]">Orion Utility Suite</div>
            </div>
          </div>
          <p className="mt-3 max-w-[230px] text-sm leading-6 text-[var(--text-secondary)]">
            Utility desktop untuk file, teks, QR, PDF, jaringan, dan pengaturan harian.
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-xl border p-2 text-[var(--text-muted)] lg:hidden"
          aria-label="Close sidebar"
        >
          <X className="size-4" />
        </button>
      </div>

      <div className="flex-1 space-y-6 overflow-y-auto pr-1">
        {navGroups.map((group) => (
          <div key={group.label}>
            <div className="mb-3 text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">{group.label}</div>
            <div className="space-y-2">
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
                        "group flex items-center gap-3 rounded-2xl border px-4 py-3 transition",
                        isActive
                          ? "border-[var(--accent-soft)] bg-[var(--accent-surface)] text-[var(--text-primary)] shadow-[0_12px_28px_color-mix(in_srgb,var(--accent-strong)_12%,transparent)]"
                          : "border-transparent text-[var(--text-secondary)] hover:border-[var(--border-subtle)] hover:bg-white/5 hover:text-[var(--text-primary)]",
                      )
                    }
                  >
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl border border-[var(--accent-soft)] bg-[var(--accent-surface)] text-[var(--accent-strong)]">
                      <Icon className="size-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold">{item.title}</div>
                      {item.description ? <div className="mt-1 text-xs text-[var(--text-muted)]">{item.description}</div> : null}
                    </div>
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="surface-panel-alt mt-6 p-4">
        <div className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">App Status</div>
        <div className="mt-3 text-sm font-semibold text-[var(--text-primary)]">
          {bootstrap.source === "rust" ? "Siap digunakan" : "Mode terbatas"}
        </div>
        <div className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">
          {bootstrap.data.platformLabel} . v{bootstrap.data.version}
        </div>
      </div>
    </aside>
  );
}
