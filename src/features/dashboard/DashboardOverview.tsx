import { HardDriveUpload, ImagePlus, Search, Wrench } from "lucide-react";
import { startTransition, useState } from "react";
import { Link } from "react-router-dom";
import { useShell } from "@/app/providers/ShellProvider";
import { EmptyState } from "@/components/common/EmptyState";
import { FeatureCard } from "@/components/common/FeatureCard";
import { PageSection } from "@/components/common/PageSection";
import { Button } from "@/components/ui/Button";
import { toolCatalog } from "@/data/toolCatalog";
import { cn } from "@/lib/utils";
import type { DashboardFilter } from "@/types/app";

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

const quickActions = [
  {
    to: "/image-converter",
    label: "Image Converter",
    caption: "Convert and resize images in bulk",
    icon: ImagePlus,
  },
  {
    to: "/network-toolkit",
    label: "Network Toolkit",
    caption: "Check IP, DNS, ping, port, and HTTP",
    icon: HardDriveUpload,
  },
  {
    to: "/developer-tools",
    label: "Advanced Tools",
    caption: "UUID, timestamp, regex, JWT, and color",
    icon: Wrench,
  },
];

export function DashboardOverview() {
  const { searchQuery, setSearchQuery } = useShell();
  const [activeFilter, setActiveFilter] = useState<DashboardFilter>("All");
  const deferredQuery = searchQuery.trim().toLowerCase();
  const dashboardFeatures = toolCatalog.filter((feature) => feature.id !== "settings");

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
    <div className="space-y-6">
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
                "rounded-full border px-4 py-2 text-xs font-semibold tracking-wide transition",
                activeFilter === filter
                  ? "border-[var(--accent-soft)] bg-[var(--accent-surface)] text-[var(--accent-strong)]"
                  : "border-[var(--border-subtle)] bg-white/5 text-[var(--text-secondary)] hover:border-[var(--accent-soft)] hover:text-[var(--text-primary)]",
              )}
            >
              {filterLabels[filter]}
            </button>
          ))}
        </div>
        <div className="text-xs text-[var(--text-muted)]">
          {filteredFeatures.length} {filteredFeatures.length === 1 ? "tool" : "tools"}
        </div>
      </div>

      {filteredFeatures.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
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
        title="Quick Access"
        description="Shortcuts to frequently used tools."
      >
        <div className="grid gap-3 md:grid-cols-3">
          {quickActions.map((action) => {
            const Icon = action.icon;

            return (
              <Link
                key={action.to}
                to={action.to}
                className="surface-panel-alt flex items-center justify-between gap-4 p-4 hover:border-[var(--accent-soft)]"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-[var(--accent-soft)] bg-[var(--accent-surface)] text-[var(--accent-strong)]">
                    <Icon className="size-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-[var(--text-primary)]">{action.label}</div>
                    <div className="mt-1 text-xs text-[var(--text-muted)]">{action.caption}</div>
                  </div>
                </div>
                <span className="text-xs font-medium text-[var(--accent-strong)]">Open</span>
              </Link>
            );
          })}
        </div>
      </PageSection>
    </div>
  );
}
