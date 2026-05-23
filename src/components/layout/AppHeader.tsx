import { BellRing, Menu, MoonStar, Search, SunMedium } from "lucide-react";
import { startTransition } from "react";
import { useMatches } from "react-router-dom";
import { useShell } from "@/app/providers/ShellProvider";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { notify } from "@/components/ui/Toast";
import type { AppBootstrapState } from "@/types/app";
import type { RouteHandle } from "@/types/navigation";

interface AppHeaderProps {
  bootstrap: AppBootstrapState;
  onOpenSidebar: () => void;
}

export function AppHeader({ bootstrap, onOpenSidebar }: AppHeaderProps) {
  const matches = useMatches();
  const { searchQuery, setSearchQuery, resolvedTheme, themeMode, toggleTheme } = useShell();

  const currentHandle = [...matches]
    .reverse()
    .map((match) => match.handle as RouteHandle | undefined)
    .find(Boolean);

  return (
    <header className="border-b border-[var(--border-subtle)] bg-[var(--surface-1)] px-4 py-4 backdrop-blur-2xl sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex items-start gap-3">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={onOpenSidebar} aria-label="Open sidebar">
            <Menu className="size-4" />
          </Button>
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-semibold text-[var(--text-primary)]">{currentHandle?.title ?? "Workspace"}</h1>
              <span className="rounded-full border border-[var(--accent-soft)] bg-[var(--accent-surface)] px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-[var(--accent-strong)]">
                {bootstrap.source === "rust" ? "Rust Ready" : "Preview Mode"}
              </span>
            </div>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">
              {currentHandle?.subtitle ?? "Scaffold modular untuk utilitas desktop lintas platform."}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="w-full min-w-0 lg:w-[320px]">
            <Input
              value={searchQuery}
              onChange={(event) => {
                const value = event.target.value;
                startTransition(() => setSearchQuery(value));
              }}
              placeholder={currentHandle?.searchPlaceholder ?? "Search modules and scaffolds"}
              icon={Search}
              aria-label="Global search"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              aria-label="Notifications"
              onClick={() =>
                notify.info(
                  "Notification center belum aktif",
                  "Tahap 10 membersihkan tombol ini agar tidak lagi terasa mati. Notifikasi inbox bisa ditambahkan di tahap berikutnya.",
                )
              }
            >
              <BellRing className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => void toggleTheme()}
              aria-label="Toggle theme"
              title={`Current theme: ${themeMode}`}
            >
              {resolvedTheme === "dark" ? <SunMedium className="size-4" /> : <MoonStar className="size-4" />}
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
