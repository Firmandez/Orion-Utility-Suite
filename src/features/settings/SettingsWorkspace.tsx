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
import orionLogo from "@/assets/orion-logo.png";
import { EmptyState } from "@/components/common/EmptyState";
import { PageSection } from "@/components/common/PageSection";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Toggle } from "@/components/ui/Toggle";
import { notify } from "@/components/ui/Toast";
import { accentPalettes, githubProfileUrl } from "@/services/settings-store";
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
  const activeAccent = accentPalettes.find((item) => item.id === accentColor);

  const handleThemeModeChange = async (value: ThemeMode) => {
    await setThemeMode(value);
    notify.success("Theme updated", `Tampilan Orion sekarang memakai mode ${value}.`);
  };

  const handleAccentChange = async (value: (typeof accentPalettes)[number]["id"]) => {
    await setAccentColor(value);
    notify.success("Accent updated", "Warna aksen Orion berhasil diperbarui.");
  };

  const handlePickDefaultFolder = async () => {
    if (!isDesktopRuntime) {
      notify.info("Buka aplikasi desktop", "Folder output hanya bisa dipilih dari aplikasi desktop Orion.");
      return;
    }

    const selection = await open({
      title: "Select default output folder",
      multiple: false,
      directory: true,
    });

    if (typeof selection === "string") {
      await setDefaultOutputFolder(selection);
      notify.success("Folder output diperbarui", "Folder ini akan dipakai sebagai lokasi output default.");
    }
  };

  const handleClearDefaultFolder = async () => {
    await setDefaultOutputFolder("");
    notify.info("Folder output dihapus", "Orion akan meminta folder tujuan saat diperlukan.");
  };

  const handleResetSettings = async () => {
    await resetAppSettings();
    notify.success("Settings reset", "Pengaturan Orion dikembalikan ke bawaan.");
  };

  const handleUnavailablePreference = (label: string) => {
    notify.info(`${label} belum tersedia`, "Opsi ini disiapkan untuk versi berikutnya.");
  };

  return (
    <div className="space-y-6">
      <section className="surface-panel relative overflow-hidden p-6 lg:p-8">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(77,216,246,0.14),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(139,92,246,0.1),transparent_24%)]" />
        <div className="relative grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-5">
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--accent-soft)] bg-[var(--accent-surface)] px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-[var(--accent-strong)]">
              <Settings2 className="size-3.5" />
              Settings
            </div>
            <div className="max-w-3xl">
              <h2 className="text-3xl font-semibold tracking-[-0.04em] text-[var(--text-primary)] sm:text-4xl">
                Atur Orion sesuai cara kerja Anda.
              </h2>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--text-secondary)] sm:text-[15px]">
                Ubah tampilan, pilih folder output, dan cek informasi aplikasi. Pengaturan akan otomatis tersimpan.
              </p>
            </div>
          </div>

          <div className="surface-panel-alt p-5 sm:p-6">
            <div className="flex items-center gap-4">
              <div className="flex size-16 items-center justify-center overflow-hidden rounded-[22px] border border-[var(--accent-soft)] bg-[var(--accent-surface)]">
                <img src={orionLogo} alt="Orion Utility Suite logo" className="size-full object-cover" />
              </div>
              <div>
                <div className="text-lg font-semibold text-[var(--text-primary)]">Orion Utility Suite</div>
                <div className="mt-1 text-sm text-[var(--text-secondary)]">v{bootstrap.data.version}</div>
              </div>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
              <SummaryItem label="Theme" value={`${themeMode} / ${resolvedTheme}`} />
              <SummaryItem label="Accent" value={activeAccent?.label ?? accentColor} />
              <SummaryItem label="Status" value={isDesktopRuntime ? "Siap digunakan" : "Mode terbatas"} />
            </div>
          </div>
        </div>
      </section>

      {settingsState.status === "loading" ? (
        <PageSection title="Memuat Pengaturan" description="Sebentar, pengaturan sedang disiapkan.">
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
                    <div className="text-sm font-semibold text-[var(--text-primary)]">Pengaturan dipulihkan</div>
                    <div className="mt-1 text-sm leading-6 text-amber-100/85">{settingsState.errorMessage}</div>
                  </div>
                </div>
                <Button variant="outline" size="sm" leadingIcon={RefreshCw} onClick={() => void reloadSettings()}>
                  Muat ulang
                </Button>
              </div>
            </div>
          ) : null}

          <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
            <PageSection title="Tampilan" description="Pilih tema dan warna aksen Orion.">
              <div className="space-y-5">
                <Select
                  label="Theme"
                  hint="System mengikuti pengaturan perangkat. Dark dan Light bisa dipilih manual."
                  options={themeModeOptions}
                  value={themeMode}
                  onChange={(event) => void handleThemeModeChange(event.target.value as ThemeMode)}
                />

                <div className="space-y-3">
                  <div>
                    <div className="text-sm font-semibold text-[var(--text-primary)]">Accent color</div>
                    <div className="mt-1 text-xs text-[var(--text-muted)]">
                      Warna ini dipakai untuk tombol utama, highlight, dan elemen aktif.
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
              title="Output"
              description="Pilih folder default untuk menyimpan hasil dari Image Converter dan PDF Tools."
              actions={
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" leadingIcon={FolderSearch2} onClick={handlePickDefaultFolder}>
                    Pilih folder
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    leadingIcon={FolderX}
                    onClick={handleClearDefaultFolder}
                    disabled={!defaultOutputFolder}
                    title={defaultOutputFolder ? "Hapus folder output default" : "Belum ada folder output default"}
                  >
                    Hapus
                  </Button>
                </div>
              }
            >
              <div className="space-y-5">
                <Input
                  label="Default output folder"
                  hint="Jika kosong, Orion akan meminta folder tujuan saat Anda menjalankan proses ekspor."
                  value={defaultOutputFolder}
                  placeholder="Belum ada folder output default."
                  readOnly
                />

                {!defaultOutputFolder ? (
                  <EmptyState
                    icon={FolderSearch2}
                    title="Belum ada folder output"
                    description="Pilih folder default untuk mempercepat pekerjaan batch."
                  />
                ) : null}
              </div>
            </PageSection>
          </div>

          <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
            <PageSection
              title="Aplikasi"
              description="Atur perilaku dasar Orion saat dibuka dan digunakan."
              actions={
                <Button variant="outline" size="sm" leadingIcon={RefreshCw} onClick={handleResetSettings}>
                  Reset settings
                </Button>
              }
            >
              <div className="space-y-4">
                <Toggle
                  label="Start with Windows"
                  hint="Belum tersedia."
                  checked={false}
                  onCheckedChange={() => handleUnavailablePreference("Start with Windows")}
                />
                <Toggle
                  label="Minimize to tray"
                  hint="Belum tersedia."
                  checked={false}
                  onCheckedChange={() => handleUnavailablePreference("Minimize to tray")}
                />
                <Toggle
                  label="Ingat ukuran dan posisi jendela"
                  hint="Orion akan membuka kembali jendela dengan ukuran terakhir."
                  checked={settings.windowPreferences.rememberWindowState}
                  onCheckedChange={(checked) => {
                    void updateWindowPreferences({ rememberWindowState: checked });
                    notify.success("Pengaturan diperbarui", checked ? "Ukuran jendela akan diingat." : "Ukuran jendela tidak lagi diingat.");
                  }}
                />
                <Toggle
                  label="Pulihkan mode layar penuh"
                  hint="Jika sebelumnya ditutup dalam mode maksimal, Orion akan mencoba membukanya seperti itu lagi."
                  checked={settings.windowPreferences.restoreMaximizedWindow}
                  onCheckedChange={(checked) => {
                    void updateWindowPreferences({ restoreMaximizedWindow: checked });
                    notify.success("Pengaturan diperbarui", checked ? "Mode maksimal akan dipulihkan." : "Mode maksimal tidak lagi dipulihkan.");
                  }}
                />
              </div>
            </PageSection>

            <PageSection title="Tentang" description="Informasi singkat tentang Orion Utility Suite.">
              <div className="space-y-5">
                <div className="flex items-start gap-4 rounded-[24px] border bg-black/10 p-5">
                  <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-[22px] border border-[var(--accent-soft)] bg-[var(--accent-surface)]">
                    <img src={orionLogo} alt="Orion Utility Suite logo" className="size-full object-cover" />
                  </div>
                  <div>
                    <div className="text-xl font-semibold text-[var(--text-primary)]">Orion Utility Suite</div>
                    <div className="mt-1 text-sm text-[var(--text-secondary)]">Version {bootstrap.data.version}</div>
                    <p className="mt-3 max-w-xl text-sm leading-6 text-[var(--text-secondary)]">
                      Kumpulan utility desktop modern untuk mengolah file, teks, QR, PDF, dan jaringan secara lokal.
                    </p>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <AboutItem icon={Sparkles} label="Nama aplikasi" value="Orion Utility Suite" />
                  <AboutItem icon={SunMoon} label="Versi" value={bootstrap.data.version} />
                  <AboutItem icon={Palette} label="License" value="MIT License" />
                  <AboutItem icon={Settings2} label="Platform Sistem" value={bootstrap.data.platformLabel} />
                </div>

                <div className="flex flex-wrap gap-3">
                  <a
                    href={githubProfileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm font-semibold text-[var(--text-primary)] transition hover:border-[var(--accent-soft)] hover:bg-white/5"
                  >
                    <ExternalLink className="size-4" />
                    GitHub
                  </a>
                  <a
                    href="https://opensource.org/license/mit"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm font-semibold text-[var(--text-primary)] transition hover:border-[var(--accent-soft)] hover:bg-white/5"
                  >
                    <ExternalLink className="size-4" />
                    License
                  </a>
                </div>
              </div>
            </PageSection>
          </div>
        </>
      )}
    </div>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border bg-black/10 px-4 py-3">
      <div className="text-xs uppercase tracking-[0.16em] text-[var(--text-muted)]">{label}</div>
      <div className="mt-2 text-sm font-semibold text-[var(--text-primary)]">{value}</div>
    </div>
  );
}

function AboutItem({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Settings2;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[22px] border bg-black/10 p-4">
      <div className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-2xl border bg-[var(--accent-surface)] text-[var(--accent-strong)]">
          <Icon className="size-4" />
        </div>
        <div>
          <div className="text-xs uppercase tracking-[0.16em] text-[var(--text-muted)]">{label}</div>
          <div className="mt-1 text-sm font-semibold text-[var(--text-primary)]">{value}</div>
        </div>
      </div>
    </div>
  );
}
