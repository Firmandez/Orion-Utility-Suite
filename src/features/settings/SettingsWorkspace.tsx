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
    notify.success("Theme updated", `Orion now uses ${value} mode.`);
  };

  const handleAccentChange = async (value: (typeof accentPalettes)[number]["id"]) => {
    await setAccentColor(value);
    notify.success("Accent updated", "Accent color updated successfully.");
  };

  const handlePickDefaultFolder = async () => {
    if (!isDesktopRuntime) {
      notify.info("Open desktop app", "Output folder can only be selected from the Orion desktop app.");
      return;
    }

    const selection = await open({
      title: "Choose default output folder",
      multiple: false,
      directory: true,
    });

    if (typeof selection === "string") {
      await setDefaultOutputFolder(selection);
      notify.success("Output folder updated", "This folder will be used as the default output location.");
    }
  };

  const handleClearDefaultFolder = async () => {
    await setDefaultOutputFolder("");
    notify.info("Output folder cleared", "Orion will ask for a destination folder when needed.");
  };

  const handleResetSettings = async () => {
    await resetAppSettings();
    notify.success("Settings reset", "Orion settings restored to defaults.");
  };

  return (
    <div className="space-y-5">
      {settingsState.status === "loading" ? (
        <PageSection title="Loading Settings" description="Just a moment, settings are loading.">
          <div className="grid gap-4 md:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="surface-panel-alt p-4">
                <div className="h-3 w-24 animate-pulse rounded-full bg-white/10" />
                <div className="mt-3 h-9 w-full animate-pulse rounded-xl bg-white/8" />
                <div className="mt-3 h-3 w-3/4 animate-pulse rounded-full bg-white/8" />
              </div>
            ))}
          </div>
        </PageSection>
      ) : (
        <>
          {settingsState.errorMessage ? (
            <div className="rounded-2xl border border-amber-400/18 bg-amber-500/10 p-3 sm:p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-start gap-3">
                  <Info className="mt-0.5 size-5 shrink-0 text-amber-300" />
                  <div>
                    <div className="text-sm font-semibold text-(--text-primary)]">Settings recovered</div>
                    <div className="mt-1 text-sm leading-5 text-amber-100/85">{settingsState.errorMessage}</div>
                  </div>
                </div>
                <Button variant="outline" size="sm" leadingIcon={RefreshCw} onClick={() => void reloadSettings()}>
                  Reload
                </Button>
              </div>
            </div>
          ) : null}

          <div className="grid items-start gap-5 xl:grid-cols-[1fr_1fr]">
            <PageSection title="Appearance" description="Choose Orion's theme and accent color.">
              <div className="space-y-4">
                <Select
                  label="Theme"
                  hint="System follows your device settings. Dark and Light can be set manually."
                  options={themeModeOptions}
                  value={themeMode}
                  onChange={(event) => void handleThemeModeChange(event.target.value as ThemeMode)}
                />

                <div className="space-y-3">
                  <div>
                    <div className="text-sm font-semibold text-(--text-primary)]">Accent color</div>
                    <div className="mt-1 text-xs text-(--text-muted)]">
                      Used for primary buttons, highlights, and active elements.
                    </div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {accentPalettes.map((palette) => (
                      <button
                        key={palette.id}
                        type="button"
                        onClick={() => void handleAccentChange(palette.id)}
                        className={`rounded-xl border p-3 text-left transition ${
                          accentColor === palette.id
                            ? "border-(--accent-soft)] bg-(--accent-surface)]"
                            : "border-(--border-subtle)] bg-white/5 hover:border-(--accent-soft)] hover:bg-white/8"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="size-9 rounded-lg border"
                            style={{
                              background: `linear-gradient(145deg, ${palette.accent}, ${palette.accentStrong})`,
                              borderColor: palette.accentSoft,
                            }}
                          />
                          <div>
                            <div className="text-sm font-semibold text-(--text-primary)]">{palette.label}</div>
                            <div className="mt-1 text-xs leading-5 text-(--text-secondary)]">{palette.description}</div>
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
              description="Choose the default folder for saving Image Converter and PDF Tools results."
              actions={
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" leadingIcon={FolderSearch2} onClick={handlePickDefaultFolder}>
                    Choose folder
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    leadingIcon={FolderX}
                    onClick={handleClearDefaultFolder}
                    disabled={!defaultOutputFolder}
                    title={defaultOutputFolder ? "Clear default output folder" : "No output folder set"}
                  >
                    Clear
                  </Button>
                </div>
              }
            >
              <div className="space-y-4">
                <Input
                  label="Default output folder"
                  hint="If empty, Orion will ask for a destination when you run an export."
                  value={defaultOutputFolder}
                  placeholder="No default output folder set."
                  readOnly
                />
              </div>
            </PageSection>
          </div>

          <div className="grid items-start gap-5 xl:grid-cols-[1fr_1fr]">
            <PageSection
              title="Application"
              description="Configure basic Orion behavior."
              actions={
                <Button variant="outline" size="sm" leadingIcon={RefreshCw} onClick={handleResetSettings}>
                  Reset settings
                </Button>
              }
            >
              <div className="space-y-4">
                <Toggle
                  label="Remember window size and position"
                  hint="Orion will reopen with the last window size."
                  checked={settings.windowPreferences.rememberWindowState}
                  onCheckedChange={(checked) => {
                    void updateWindowPreferences({ rememberWindowState: checked });
                    notify.success("Setting updated", checked ? "Window size will be remembered." : "Window size will no longer be remembered.");
                  }}
                />
                <Toggle
                  label="Restore maximized mode"
                  hint="If previously closed while maximized, Orion will try to reopen that way."
                  checked={settings.windowPreferences.restoreMaximizedWindow}
                  onCheckedChange={(checked) => {
                    void updateWindowPreferences({ restoreMaximizedWindow: checked });
                    notify.success("Setting updated", checked ? "Maximized mode will be restored." : "Maximized mode will no longer be restored.");
                  }}
                />
              </div>
            </PageSection>

            <PageSection title="About" description="Information about Orion Utility Suite.">
              <div className="space-y-5">
                <div className="grid gap-3 sm:grid-cols-2">
                  <AboutItem icon={Sparkles} label="App" value="Orion Utility Suite" />
                  <AboutItem icon={SunMoon} label="Version" value={bootstrap.data.version} />
                  <AboutItem icon={Palette} label="License" value="MIT License" />
                  <AboutItem icon={Settings2} label="Platform" value={bootstrap.data.platformLabel} />
                </div>

                <div className="flex flex-wrap gap-3">
                  <a
                    href={githubProfileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-10 items-center gap-2 rounded-lg border px-3.5 text-sm font-semibold text-(--text-primary)] transition hover:border-(--accent-soft)] hover:bg-white/5"
                  >
                    <ExternalLink className="size-4" />
                    GitHub
                  </a>
                  <a
                    href="https://opensource.org/license/mit"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-10 items-center gap-2 rounded-lg border px-3.5 text-sm font-semibold text-(--text-primary)] transition hover:border-(--accent-soft)] hover:bg-white/5"
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
    <div className="rounded-xl border bg-black/10 p-3">
      <div className="flex items-center gap-3">
        <div className="flex size-9 items-center justify-center rounded-lg border bg-(--accent-surface)] text-(--accent-strong)]">
          <Icon className="size-4" />
        </div>
        <div>
          <div className="text-[11px] uppercase tracking-[0.08em] text-(--text-muted)]">{label}</div>
          <div className="mt-1 text-sm font-semibold text-(--text-primary)]">{value}</div>
        </div>
      </div>
    </div>
  );
}
