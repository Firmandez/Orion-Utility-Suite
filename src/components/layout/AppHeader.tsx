import { Menu, MoonStar, Search, SunMedium } from "lucide-react";
import { startTransition } from "react";
import { useMatches } from "react-router-dom";
import { useShell } from "@/app/providers/ShellProvider";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import type { RouteHandle } from "@/types/navigation";

interface AppHeaderProps {
  bootstrap: unknown;
  onOpenSidebar: () => void;
}

export function AppHeader({ onOpenSidebar }: AppHeaderProps) {
  const matches = useMatches();
  const { searchQuery, setSearchQuery, resolvedTheme, themeMode, toggleTheme } = useShell();

  const currentHandle = [...matches]
    .reverse()
    .map((match) => match.handle as RouteHandle | undefined)
    .find(Boolean);

  return (
    <header className="border-b border-(--border-subtle)] bg-(--surface-1)] px-4 py-3 backdrop-blur-2xl sm:px-5 lg:px-6">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex items-start gap-3">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={onOpenSidebar} aria-label="Open sidebar">
            <Menu className="size-4" />
          </Button>
          <h1 className="text-xl font-semibold text-(--text-primary)]">{currentHandle?.title ?? "Orion Utility Suite"}</h1>
        </div>

        <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center">
          <div className="w-full min-w-0 lg:w-[320px]">
            <Input
              value={searchQuery}
              onChange={(event) => {
                const value = event.target.value;
                startTransition(() => setSearchQuery(value));
              }}
              placeholder={currentHandle?.searchPlaceholder ?? "Search utilities"}
              icon={Search}
              aria-label="Global search"
            />
          </div>
          <div className="flex items-center gap-2">
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
