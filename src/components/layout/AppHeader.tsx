import { Menu, MoonStar, SunMedium } from "lucide-react";
import { useMatches } from "react-router-dom";
import { useShell } from "@/app/providers/ShellProvider";
import { Button } from "@/components/ui/Button";
import type { RouteHandle } from "@/types/navigation";

interface AppHeaderProps {
  bootstrap: unknown;
  onOpenSidebar: () => void;
}

export function AppHeader({ onOpenSidebar }: AppHeaderProps) {
  const matches = useMatches();
  const { resolvedTheme, themeMode, toggleTheme } = useShell();

  const currentHandle = [...matches]
    .reverse()
    .map((match) => match.handle as RouteHandle | undefined)
    .find(Boolean);

  return (
    <header className="border-b border-(--border-subtle) bg-(--surface-1) px-3.5 py-2.5 backdrop-blur-2xl sm:px-4 lg:px-5">
      <div className="flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex items-start gap-3">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={onOpenSidebar} aria-label="Open sidebar">
            <Menu className="size-4" />
          </Button>
          <h1 className="text-lg font-semibold text-(--text-primary)">{currentHandle?.title ?? "Orion Utility Suite"}</h1>
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
    </header>
  );
}
