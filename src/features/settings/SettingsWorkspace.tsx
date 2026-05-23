import {
  ExternalLink,
  FolderSearch2,
  FolderX,
  Info,
  Palette,
  RefreshCw,
  Settings2,
  Sparkles,
  SunMoon,
} from "lucide-react";
import { open } from "@tauri-apps/plugin-dialog";
import { useOutletContext } from "react-router-dom";
import { useShell } from "@/app/providers/ShellProvider";
import { EmptyState } from "@/components/common/EmptyState";
import { PageSection } from "@/components/common/PageSection";
import { ResultCard } from "@/components/common/ResultCard";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Toggle } from "@/components/ui/Toggle";
import { notify } from "@/components/ui/Toast";
import {
  accentPalettes,
  githubProfileUrl,
  settingsStoreFileName,
} from "@/services/settings-store";
import type { AppBootstrapState, ThemeMode } from "@/types/app";

const themeModeOptions = [
  { value: "system", label: "System" },
  { value: "dark", label: "Dark" },
  { value: "light", label: "Light" },
];

export function SettingsWorkspace() {
  const bootstrap = useOutletContext<AppBootstrapState>();
  const {
    settingsState,
    settings,
    themeMode,
    resolvedTheme,
    accentColor,
    defaultOutputFolder,
    setThemeMode,
    setAccentColor,
    setDefaultOutputFolder,
    updateWindowPreferences,
    resetAppSettings,
    reloadSettings,
  } = useShell();
  const isDesktopRuntime = bootstrap.source === "rust";

  const handleThemeModeChange = async (value: ThemeMode) => {
    await setThemeMode(value);
    notify.success("Theme updated", `Theme mode sekarang memakai ${value}.`);
  };

  const handleAccentChange = async (value: (typeof accentPalettes)[number]["id"]) => {
    await setAccentColor(value);
    notify.success("Accent updated", "Accent color Orion berhasil diperbarui.");
  };

  const handlePickDefaultFolder = async () => {
    if (!isDesktopRuntime) {
      notify.info("Desktop runtime required", "Default output folder hanya bisa dipilih lewat dialog native saat Orion berjalan sebagai desktop app.");
      return;
    }

    const selection = await open({
      title: "Select default output folder",
      multiple: false,
      directory: true,
    });

    if (typeof selection === "string") {
      await setDefaultOutputFolder(selection);
      notify.success("Default output folder updated", "Image Converter dan PDF Tools sekarang bisa memakai folder default ini.");
    }
  };

  const handleClearDefaultFolder = async () => {
    await setDefaultOutputFolder("");
    notify.info("Default output folder cleared", "Workspace akan kembali meminta output folder secara manual bila diperlukan.");
  };

  const handleResetSettings = async () => {
    await resetAppSettings();
    notify.success("Settings reset", "Semua preferensi Orion dikembalikan ke default aman.");
  };

  return (
    <div className="space-y-6">
      <section className="surface-panel relative overflow-hidden p-6 lg:p-8">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(77,216,246,0.16),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(139,92,246,0.12),transparent_24%)]" />
        <div className="relative grid gap-6 xl:grid-cols-[1.12fr_0.88fr]">
          <div className="space-y-5">
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--accent-soft)] bg-[var(--accent-surface)] px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-[var(--accent-strong)]">
              <Settings2 className="size-3.5" />
              Persistent App Preferences
            </div>
            <div className="max-w-3xl">
              <h2 className="text-3xl font-semibold tracking-[-0.04em] text-[var(--text-primary)] sm:text-4xl">
                Settings center untuk tema, accent, output defaults, dan build readiness Orion.
              </h2>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--text-secondary)] sm:text-[15px]">
                Tahap 10 memindahkan preferensi ke plugin resmi Tauri Store agar native, persistent antar
                restart, dan lebih siap untuk penggunaan desktop production-ready.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <StatCard
                label="Store file"
                value={settingsStoreFileName}
                caption="Disimpan di app data directory milik Tauri, bukan localStorage utama."
              />
              <StatCard
                label="Theme"
                value={`${themeMode} / ${resolvedTheme}`}
                caption="System mode mengikuti preferensi OS, sementara dark dan light bisa dipaksa manual."
              />
              <StatCard
                label="Runtime"
                value={isDesktopRuntime ? "Tauri Desktop" : "Browser Preview"}
                caption="Persistence penuh tersedia saat Orion berjalan di runtime desktop."
              />
            </div>
          </div>

          <div className="surface-panel-alt p-5 sm:p-6">
            <div className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">Polish Notes</div>
            <div className="mt-4 space-y-3">
              <InfoItem
                title="Settings fallback"
                description="Jika file settings corrupt atau key hilang, Orion akan kembali ke default aman lalu menulis ulang file store."
              />
              <InfoItem
                title="Cross-workspace output folder"
                description="Default output folder sekarang bisa dipakai ulang oleh Image Converter dan PDF Tools ketika user belum memilih folder khusus."
              />
              <InfoItem
                title="No dead header button"
                description="Tombol notifikasi di header sekarang memberi placeholder toast yang jelas, bukan lagi klik kosong tanpa feedback."
              />
            </div>
          </div>
        </div>
      </section>

      {settingsState.status === "loading" ? (
        <PageSection title="Loading Settings" description="Orion sedang memuat preferensi dari settings.json.">
          <div className="grid gap-4 md:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="surface-panel-alt p-5">
                <div className="h-3 w-24 animate-pulse rounded-full bg-white/10" />
                <div className="mt-4 h-10 w-full animate-pulse rounded-2xl bg-white/8" />
                <div className="mt-3 h-3 w-3/4 animate-pulse rounded-full bg-white/8" />
              </div>
            ))}
          </div>
        </PageSection>
      ) : (
        <>
          {settingsState.errorMessage ? (
            <div className="rounded-[26px] border border-amber-400/18 bg-amber-500/10 p-4 sm:p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-start gap-3">
                  <Info className="mt-0.5 size-5 shrink-0 text-amber-300" />
                  <div>
                    <div className="text-sm font-semibold text-[var(--text-primary)]">Settings fallback activated</div>
                    <div className="mt-1 text-sm leading-6 text-amber-100/85">{settingsState.errorMessage}</div>
                  </div>
                </div>
                <Button variant="outline" size="sm" leadingIcon={RefreshCw} onClick={() => void reloadSettings()}>
                  Reload
                </Button>
              </div>
            </div>
          ) : null}

          <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
            <PageSection title="Appearance" description="Kelola theme mode dan accent color global yang dipakai shell Orion.">
              <div className="space-y-5">
                <Select
                  label="Theme mode"
                  hint="System mode mengikuti preferensi OS. Header toggle tetap bisa memaksa dark/light dengan sekali klik."
                  options={themeModeOptions}
                  value={themeMode}
                  onChange={(event) => void handleThemeModeChange(event.target.value as ThemeMode)}
                />

                <div className="space-y-3">
                  <div>
                    <div className="text-sm font-semibold text-[var(--text-primary)]">Accent color</div>
                    <div className="mt-1 text-xs text-[var(--text-muted)]">
                      Accent ini dipakai untuk shell, tombol utama, focus ring, dan state interaktif yang sudah dipoles di Tahap 10.
                    </div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {accentPalettes.map((palette) => (
                      <button
                        key={palette.id}
                        type="button"
                        onClick={() => void handleAccentChange(palette.id)}
                        className={`rounded-[22px] border p-4 text-left transition ${
                          accentColor === palette.id
                            ? "border-[var(--accent-soft)] bg-[var(--accent-surface)]"
                            : "border-[var(--border-subtle)] bg-white/5 hover:border-[var(--accent-soft)] hover:bg-white/8"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="size-11 rounded-2xl border"
                            style={{
                              background: `linear-gradient(145deg, ${palette.accent}, ${palette.accentStrong})`,
                              borderColor: palette.accentSoft,
                            }}
                          />
                          <div>
                            <div className="text-sm font-semibold text-[var(--text-primary)]">{palette.label}</div>
                            <div className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">{palette.description}</div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </PageSection>

            <PageSection
              title="Default Paths"
              description="Folder default ini dipakai lintas workspace sebagai fallback saat user belum memilih lokasi output secara manual."
              actions={
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" leadingIcon={FolderSearch2} onClick={handlePickDefaultFolder}>
                    Pick folder
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    leadingIcon={FolderX}
                    onClick={handleClearDefaultFolder}
                    disabled={!defaultOutputFolder}
                    title={defaultOutputFolder ? "Clear default output folder" : "Tidak ada default output folder untuk dibersihkan"}
                  >
                    Clear folder
                  </Button>
                </div>
              }
            >
              <div className="space-y-5">
                <Input
                  label="Default output folder"
                  hint="Saat field ini kosong, Image Converter dan PDF Tools akan tetap meminta output folder secara manual."
                  value={defaultOutputFolder}
                  placeholder="Belum ada default output folder yang dipilih."
                  readOnly
                />

                {!defaultOutputFolder ? (
                  <EmptyState
                    icon={FolderSearch2}
                    title="Belum ada default output folder"
                    description="Pilih folder default jika Anda ingin workflow batch lebih cepat saat membuka Image Converter atau PDF Tools."
                  />
                ) : null}
              </div>
            </PageSection>
          </div>

          <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
            <PageSection title="Window Preferences" description="Preferensi ini membantu Orion mengingat ukuran dan posisi window desktop bila runtime mengizinkan.">
              <div className="space-y-4">
                <Toggle
                  label="Remember window size and position"
                  hint="Saat aktif, Orion menyimpan snapshot window terakhir ke settings.json dan mencoba mengembalikannya pada startup berikutnya."
                  checked={settings.windowPreferences.rememberWindowState}
                  onCheckedChange={(checked) => {
                    void updateWindowPreferences({ rememberWindowState: checked });
                    notify.success("Window preference updated", checked ? "Orion akan mengingat state window terakhir." : "Orion tidak lagi menyimpan state window terakhir.");
                  }}
                />
                <Toggle
                  label="Restore maximized state"
                  hint="Jika window terakhir ditutup dalam keadaan maximized, Orion akan mencoba membukanya kembali dalam mode yang sama."
                  checked={settings.windowPreferences.restoreMaximizedWindow}
                  onCheckedChange={(checked) => {
                    void updateWindowPreferences({ restoreMaximizedWindow: checked });
                    notify.success("Maximized restore updated", checked ? "State maximized akan dipulihkan bila tersedia." : "Orion hanya akan memulihkan ukuran dan posisi biasa.");
                  }}
                />
              </div>
            </PageSection>

            <ResultCard
              title="Current Settings Snapshot"
              description="Ringkasan cepat dari preferensi global yang sedang aktif di shell Orion."
              rows={[
                { label: "Theme mode", value: themeMode },
                { label: "Resolved theme", value: resolvedTheme },
                { label: "Accent", value: accentPalettes.find((item) => item.id === accentColor)?.label ?? accentColor },
                { label: "Default output", value: defaultOutputFolder || "Not set" },
                {
                  label: "Remember window",
                  value: settings.windowPreferences.rememberWindowState ? "Enabled" : "Disabled",
                },
                {
                  label: "Restore maximized",
                  value: settings.windowPreferences.restoreMaximizedWindow ? "Enabled" : "Disabled",
                },
              ]}
              footer={
                <Button variant="outline" leadingIcon={RefreshCw} onClick={handleResetSettings}>
                  Reset to defaults
                </Button>
              }
            />
          </div>

          <div className="grid gap-6 xl:grid-cols-[0.94fr_1.06fr]">
            <ResultCard
              title="About Orion Utility Suite"
              description="Metadata build dan runtime saat ini untuk membantu review release readiness."
              rows={[
                { label: "App version", value: bootstrap.data.version, mono: true },
                { label: "Backend mode", value: bootstrap.data.backendMode },
                { label: "Platform", value: bootstrap.data.platformLabel },
                { label: "Runtime status", value: bootstrap.data.runtimeStatus },
                { label: "Store file", value: settingsStoreFileName, mono: true },
              ]}
              footer={
                <a
                  href={githubProfileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm font-semibold text-[var(--text-primary)] transition hover:border-[var(--accent-soft)] hover:bg-white/5"
                >
                  <ExternalLink className="size-4" />
                  GitHub profile
                </a>
              }
            />

            <PageSection title="Build Readiness Notes" description="Catatan kecil yang membantu menjaga Tahap 10 tetap fokus pada stabilitas dan kesiapan rilis lokal.">
              <div className="grid gap-3 sm:grid-cols-2">
                <MiniInfoCard
                  icon={SunMoon}
                  title="Native persistence"
                  description="Theme, accent, output folder default, dan window preference sekarang memakai plugin store resmi Tauri."
                />
                <MiniInfoCard
                  icon={Palette}
                  title="UI consistency"
                  description="Shared input, button, toggle, empty state, dan chrome shell sekarang mengikuti accent color global yang sama."
                />
                <MiniInfoCard
                  icon={Sparkles}
                  title="Light polish"
                  description="Loading state, error fallback, toast placeholder, dan layout responsive dirapikan tanpa menambah fitur berat baru."
                />
                <MiniInfoCard
                  icon={Info}
                  title="Recovery path"
                  description="Jika settings.json hilang atau corrupt, Orion kembali ke default aman lalu mencoba menulis ulang file store untuk sesi berikutnya."
                />
              </div>
            </PageSection>
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  caption,
}: {
  label: string;
  value: string;
  caption: string;
}) {
  return (
    <div className="surface-panel-alt p-4">
      <div className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">{label}</div>
      <div className="mt-3 text-lg font-semibold text-[var(--text-primary)]">{value}</div>
      <div className="mt-2 text-xs leading-6 text-[var(--text-secondary)]">{caption}</div>
    </div>
  );
}

function InfoItem({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-[22px] border bg-black/10 p-4">
      <div className="text-sm font-semibold text-[var(--text-primary)]">{title}</div>
      <div className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{description}</div>
    </div>
  );
}

function MiniInfoCard({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof Settings2;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-[22px] border bg-black/10 p-4">
      <div className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-2xl border bg-[var(--accent-surface)] text-[var(--accent-strong)]">
          <Icon className="size-4" />
        </div>
        <div className="text-sm font-semibold text-[var(--text-primary)]">{title}</div>
      </div>
      <div className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">{description}</div>
    </div>
  );
}
