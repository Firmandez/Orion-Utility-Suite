import {
  AlertTriangle,
  AppWindow,
  HardDriveUpload,
  Network,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Wrench,
} from "lucide-react";
import { startTransition, useDeferredValue, useState } from "react";
import { Link } from "react-router-dom";
import { useShell } from "@/app/providers/ShellProvider";
import { EmptyState } from "@/components/common/EmptyState";
import { FeatureCard } from "@/components/common/FeatureCard";
import { PageSection } from "@/components/common/PageSection";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { toolCatalog } from "@/data/toolCatalog";
import { useDashboardSystemInfo } from "@/hooks/useDashboardSystemInfo";
import { cn } from "@/lib/utils";
import type { AppBootstrapState, DashboardFilter } from "@/types/app";

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
  All: "Semua",
  Generator: "Generator",
  Converter: "Converter",
  PDF: "PDF",
  Text: "Teks",
  Network: "Jaringan",
  Advanced: "Lanjutan",
  "File Tools": "File",
};

const quickActions = [
  {
    label: "Image Converter",
    to: "/image-converter",
    icon: HardDriveUpload,
    caption: "Ubah format dan ukuran banyak gambar",
  },
  {
    label: "Network Toolkit",
    to: "/network-toolkit",
    icon: Network,
    caption: "Cek IP, DNS, ping, port, dan HTTP",
  },
  {
    label: "Advanced Tools",
    to: "/developer-tools",
    icon: Wrench,
    caption: "UUID, timestamp, regex, JWT, dan warna",
  },
];

export function DashboardOverview({ bootstrap }: { bootstrap: AppBootstrapState }) {
  const { searchQuery, setSearchQuery } = useShell();
  const [activeFilter, setActiveFilter] = useState<DashboardFilter>("All");
  const deferredQuery = useDeferredValue(searchQuery.trim().toLowerCase());
  const systemState = useDashboardSystemInfo(bootstrap);
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

  const systemCards = [
    {
      label: "Platform Sistem",
      value: systemState.systemInfo?.os ?? "Loading...",
      caption: "Sistem operasi perangkat Anda.",
    },
    {
      label: "Versi Aplikasi",
      value: systemState.systemInfo?.appVersion ?? bootstrap.data.version,
      caption: "Versi Orion yang sedang digunakan.",
    },
    {
      label: "IP Lokal",
      value: systemState.localIp?.localIp ?? "Unavailable",
      caption: "Berguna saat memakai alat jaringan.",
    },
    {
      label: "Status Aplikasi",
      value: bootstrap.source === "rust" ? "Siap digunakan" : "Mode terbatas",
      caption: bootstrap.source === "rust" ? "Semua fitur desktop tersedia." : "Beberapa fitur file tersedia di aplikasi desktop.",
    },
  ];

  const overviewStats = [
    {
      label: "Utilities tersedia",
      value: `${dashboardFeatures.length}`,
      caption: "Alat utama siap dipakai.",
      icon: Sparkles,
    },
    {
      label: "Kategori",
      value: `${dashboardFilters.length - 1}`,
      caption: "Filter untuk menemukan alat lebih cepat.",
      icon: ShieldCheck,
    },
    {
      label: "Status aplikasi",
      value: bootstrap.source === "rust" ? "Aktif" : "Terbatas",
      caption: bootstrap.source === "rust" ? "Orion siap digunakan." : "Gunakan aplikasi desktop untuk fitur lengkap.",
      icon: AppWindow,
    },
  ];

  return (
    <div className="space-y-6">
      <section className="surface-panel relative overflow-hidden p-6 lg:p-8">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(77,216,246,0.16),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(59,130,246,0.12),transparent_24%)]" />
        <div className="relative grid gap-6 xl:grid-cols-[1.2fr_0.9fr]">
          <div className="space-y-6">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-[var(--accent-soft)] bg-[var(--accent-surface)] px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-[var(--accent-strong)]">
                <Sparkles className="size-3.5" />
                Orion Utility Suite
              </div>
              <h2 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-[var(--text-primary)] sm:text-4xl">
                Semua utility harian dalam satu aplikasi desktop.
              </h2>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--text-secondary)] sm:text-[15px]">
                Buka alat yang Anda butuhkan, cari berdasarkan fungsi, dan lihat informasi aplikasi secara cepat.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {overviewStats.map((stat) => {
                const Icon = stat.icon;

                return (
                  <div key={stat.label} className="surface-panel-alt p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">{stat.label}</div>
                      <div className="flex size-10 items-center justify-center rounded-2xl border border-[var(--accent-soft)] bg-[var(--accent-surface)] text-[var(--accent-strong)]">
                        <Icon className="size-4" />
                      </div>
                    </div>
                    <div className="mt-4 text-2xl font-semibold text-[var(--text-primary)]">{stat.value}</div>
                    <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{stat.caption}</p>
                  </div>
                );
              })}
            </div>

            <div className="surface-panel-alt p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <div className="text-sm font-semibold text-[var(--text-primary)]">Cari Utility</div>
                  <div className="mt-1 text-xs text-[var(--text-muted)]">
                    Cari berdasarkan nama, kategori, atau fungsi.
                  </div>
                </div>
                <div className="text-xs uppercase tracking-[0.16em] text-[var(--text-muted)]">
                  {filteredFeatures.length} hasil
                </div>
              </div>
              <div className="mt-4">
                <Input
                  icon={Search}
                  value={searchQuery}
                  onChange={(event) => {
                    const value = event.target.value;
                    startTransition(() => setSearchQuery(value));
                  }}
                  placeholder="Cari QR, PDF, hash, DNS, gambar..."
                  aria-label="Search utilities"
                />
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {dashboardFilters.map((filter) => (
                  <button
                    key={filter}
                    type="button"
                    aria-pressed={activeFilter === filter}
                    onClick={() => {
                      startTransition(() => setActiveFilter(filter));
                    }}
                    className={cn(
                      "rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] transition",
                      activeFilter === filter
                        ? "border-[var(--accent-soft)] bg-[var(--accent-surface)] text-[var(--accent-strong)]"
                        : "border-[var(--border-subtle)] bg-white/5 text-[var(--text-secondary)] hover:border-[var(--accent-soft)] hover:text-[var(--text-primary)]",
                    )}
                  >
                    {filterLabels[filter]}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="surface-panel-alt p-5 sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">Informasi Aplikasi</div>
                <h3 className="mt-3 text-2xl font-semibold text-[var(--text-primary)]">Status perangkat</h3>
                <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                  Informasi sistem perangkat Anda.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                leadingIcon={RefreshCw}
                loading={systemState.status === "loading"}
                onClick={systemState.reload}
              >
                Refresh
              </Button>
            </div>

            {systemState.status === "error" && systemState.errorMessage ? (
              <div className="mt-5 rounded-2xl border border-amber-400/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-300" />
                  <div>
                    <div className="font-semibold">Sebagian informasi belum tersedia</div>
                    <div className="mt-1 text-xs leading-6 text-amber-100/80">{systemState.errorMessage}</div>
                  </div>
                </div>
              </div>
            ) : null}

            {systemState.status === "loading" && !systemState.systemInfo ? (
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="rounded-[22px] border bg-white/5 p-4">
                    <div className="h-3 w-20 animate-pulse rounded-full bg-white/10" />
                    <div className="mt-4 h-8 w-32 animate-pulse rounded-xl bg-white/10" />
                    <div className="mt-3 h-3 w-full animate-pulse rounded-full bg-white/8" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {systemCards.map((card) => (
                  <div key={card.label} className="rounded-[22px] border bg-white/5 p-4">
                    <div className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">{card.label}</div>
                    <div className="mt-4 break-words text-xl font-semibold text-[var(--text-primary)]">{card.value}</div>
                    <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">{card.caption}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      <PageSection
        title="Utilities"
        description="Pilih alat yang ingin digunakan. Pencarian dan filter membantu menemukan fungsi lebih cepat."
        actions={
          <div className="rounded-full border border-[var(--accent-soft)] bg-[var(--accent-surface)] px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-[var(--accent-strong)]">
            {filterLabels[activeFilter]}
          </div>
        }
      >
        {filteredFeatures.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredFeatures.map((feature) => (
              <FeatureCard key={feature.id} feature={feature} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Search}
            title="Utility tidak ditemukan"
            description="Coba kata kunci lain, ganti kategori filter, atau reset pencarian untuk melihat seluruh utility yang tersedia."
            action={
              <div className="flex flex-wrap justify-center gap-3">
                <Button
                  variant="secondary"
                  onClick={() => {
                    startTransition(() => setSearchQuery(""));
                  }}
                >
                  Reset pencarian
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    startTransition(() => setActiveFilter("All"));
                  }}
                >
                  Tampilkan semua
                </Button>
              </div>
            }
          />
        )}
      </PageSection>

      <PageSection
        title="Quick Access"
        description="Shortcut untuk alat yang paling sering dipakai."
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
                  <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl border border-[var(--accent-soft)] bg-[var(--accent-surface)] text-[var(--accent-strong)]">
                    <Icon className="size-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-[var(--text-primary)]">{action.label}</div>
                    <div className="mt-1 text-xs text-[var(--text-muted)]">{action.caption}</div>
                  </div>
                </div>
                <span className="text-xs uppercase tracking-[0.16em] text-[var(--accent-strong)]">Buka</span>
              </Link>
            );
          })}
        </div>
      </PageSection>
    </div>
  );
}
