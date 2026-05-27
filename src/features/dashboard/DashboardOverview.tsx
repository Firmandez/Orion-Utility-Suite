import {
  Cpu,
  Globe,
  Laptop,
  Network,
  RefreshCw,
  Search,
  ShieldCheck,
  Tag,
} from "lucide-react";
import { startTransition, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { useShell } from "@/app/providers/ShellProvider";
import { EmptyState } from "@/components/common/EmptyState";
import { FeatureCard } from "@/components/common/FeatureCard";
import { PageSection } from "@/components/common/PageSection";
import { Button } from "@/components/ui/Button";
import { toolCatalog } from "@/data/toolCatalog";
import { cn } from "@/lib/utils";
import type { AppBootstrapState, DashboardFilter } from "@/types/app";
import { useDashboardSystemInfo } from "@/hooks/useDashboardSystemInfo";

const dashboardFilters: DashboardFilter[] = [
  "All",
  "Generator",
  "Converter",
  "PDF",
  "Text",
  "Network",
  "Advanced",
  "File Tools",
];

const filterLabels: Record<DashboardFilter, string> = {
  All: "All",
  Generator: "Generator",
  Converter: "Converter",
  PDF: "PDF",
  Text: "Text",
  Network: "Network",
  Advanced: "Advanced",
  "File Tools": "File",
};



export function DashboardOverview() {
  const { searchQuery, setSearchQuery } = useShell();
  const [activeFilter, setActiveFilter] = useState<DashboardFilter>("All");
  const deferredQuery = searchQuery.trim().toLowerCase();
  const dashboardFeatures = toolCatalog.filter((feature) => feature.id !== "settings");

  const bootstrap = useOutletContext<AppBootstrapState>();
  const isDesktopRuntime = bootstrap.source === "rust";
  const sys = useDashboardSystemInfo(bootstrap);

  const filteredFeatures = dashboardFeatures.filter((feature) => {
    const matchesCategory = activeFilter === "All" || feature.category === activeFilter;

    if (!matchesCategory) {
      return false;
    }

    if (!deferredQuery) {
      return true;
    }

    return [
      feature.title,
      feature.description,
      feature.category,
      feature.summary,
      ...feature.keywords,
    ]
      .join(" ")
      .toLowerCase()
      .includes(deferredQuery);
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {dashboardFilters.map((filter) => (
            <button
              key={filter}
              type="button"
              aria-pressed={activeFilter === filter}
              onClick={() => {
                startTransition(() => setActiveFilter(filter));
              }}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-semibold tracking-wide transition",
                activeFilter === filter
                  ? "border-(--accent-soft) bg-(--accent-surface) text-(--accent-strong)"
                  : "border-(--border-subtle) bg-white/5 text-(--text-secondary) hover:border-(--accent-soft) hover:text-(--text-primary)",
              )}
            >
              {filterLabels[filter]}
            </button>
          ))}
        </div>
        <div className="text-xs text-(--text-muted)">
          {filteredFeatures.length} {filteredFeatures.length === 1 ? "tool" : "tools"}
        </div>
      </div>

      {filteredFeatures.length > 0 ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filteredFeatures.map((feature) => (
            <FeatureCard key={feature.id} feature={feature} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Search}
          title="No tools found"
          description="Try different keywords or change the category filter."
          action={
            <div className="flex flex-wrap justify-center gap-3">
              <Button
                variant="secondary"
                onClick={() => {
                  startTransition(() => setSearchQuery(""));
                }}
              >
                Clear search
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  startTransition(() => setActiveFilter("All"));
                }}
              >
                Show all
              </Button>
            </div>
          }
        />
      )}

      <PageSection
        title="Diagnostics & Security Status"
        description="Real-time host environment, local network info, and offline security verification."
        actions={
          isDesktopRuntime && (
            <Button
              variant="outline"
              size="sm"
              leadingIcon={RefreshCw}
              onClick={sys.reload}
              disabled={sys.status === "loading"}
            >
              Refresh
            </Button>
          )
        }
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {/* Card 1: Host System */}
          <div className="rounded-xl border border-(--border-subtle) bg-white/5 p-4 transition hover:border-(--accent-soft)">
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-lg border border-sky-500/20 bg-sky-500/10 text-sky-400">
                <Laptop className="size-4.5" />
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-[0.08em] text-(--text-muted)">Host System</div>
                <div className="mt-1 text-sm font-bold text-(--text-primary) truncate max-w-[200px]" title={sys.systemInfo?.os || bootstrap.data.platformLabel}>
                  {sys.systemInfo?.os || bootstrap.data.platformLabel}
                </div>
                <div className="mt-0.5 text-xs text-(--text-muted) flex items-center gap-1.5">
                  <Cpu className="size-3" />
                  {sys.systemInfo?.architecture || (isDesktopRuntime ? "Loading..." : "Web Sandbox")}
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Local Network */}
          <div className="rounded-xl border border-(--border-subtle) bg-white/5 p-4 transition hover:border-(--accent-soft)">
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-lg border border-emerald-500/20 bg-emerald-500/10 text-emerald-400">
                <Network className="size-4.5" />
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-[0.08em] text-(--text-muted)">Local Network</div>
                <div className="mt-1 text-sm font-bold text-(--text-primary)">
                  {sys.localIp?.localIp || (isDesktopRuntime ? "Loading IP..." : "127.0.0.1")}
                </div>
                <div className="mt-0.5 text-xs text-(--text-muted) flex items-center gap-1.5">
                  <Globe className="size-3" />
                  Gateway: {sys.localIp?.defaultGateway || (isDesktopRuntime ? "Loading..." : "None")}
                </div>
              </div>
            </div>
          </div>

          {/* Card 3: Orion Suite Diagnostics */}
          <div className="rounded-xl border border-(--border-subtle) bg-white/5 p-4 transition hover:border-(--accent-soft)">
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-lg border border-violet-500/20 bg-violet-500/10 text-violet-400">
                <ShieldCheck className="size-4.5" />
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-[0.08em] text-(--text-muted)">Security & Integrity</div>
                <div className="mt-1 text-sm font-bold text-(--text-primary) flex items-center gap-1.5">
                  <Tag className="size-3.5" />
                  Orion v{bootstrap.data.version}
                </div>
                <div className="mt-0.5 text-xs text-emerald-400/90 font-medium">
                  100% Offline-First Sandbox Active
                </div>
              </div>
            </div>
          </div>
        </div>
      </PageSection>
    </div>
  );
}
