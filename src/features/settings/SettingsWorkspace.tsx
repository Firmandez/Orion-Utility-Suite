import {
  AppWindow,
  Cpu,
  ExternalLink,
  FolderSearch2,
  FolderX,
  Info,
  RefreshCw,
  Scale,
  Settings2,
  Tag,
} from "lucide-react";
import { useState } from "react";
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
import { openExternalUrl } from "@/lib/tauri";

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
  const [checkingUpdate, setCheckingUpdate] = useState(false);

  const handleCheckForUpdates = async () => {
    if (!isDesktopRuntime) return;
    
    setCheckingUpdate(true);
    notify.info("Checking for updates", "Looking for the latest version of Orion...");
    
    try {
      const { check } = await import("@tauri-apps/plugin-updater");
      const { relaunch } = await import("@tauri-apps/plugin-process");
      
      const update = await check();
      
      if (update && update.available) {
        notify.success("Update Available", `Downloading version v${update.version} in the background...`);
        
        // Download and install the update
        await update.downloadAndInstall();
        
        notify.success("Update Complete", "Relaunching Orion to apply changes...");
        
        // Relaunch the application
        await relaunch();
      } else {
        notify.success("Up to Date", "You are already using the latest version of Orion.");
      }
    } catch (error) {
      console.error("Failed to check for updates:", error);
      notify.error("Failed to check update", error instanceof Error ? error.message : "An unexpected error occurred.");
    } finally {
      setCheckingUpdate(false);
    }
  };

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
    <div className="space-y-4">
      {settingsState.status === "loading" ? (
        <PageSection title="Loading Settings" description="Just a moment, settings are loading.">
          <div className="grid gap-3 md:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="surface-panel-alt p-3">
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
            <div className="rounded-xl border border-amber-400/18 bg-amber-500/10 p-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-start gap-3">
                  <Info className="mt-0.5 size-4 shrink-0 text-amber-300" />
                  <div>
                    <div className="text-sm font-semibold text-(--text-primary)">Settings recovered</div>
                    <div className="mt-1 text-xs leading-4 text-amber-100/85">{settingsState.errorMessage}</div>
                  </div>
                </div>
                <Button variant="outline" size="sm" leadingIcon={RefreshCw} onClick={() => void reloadSettings()}>
                  Reload
                </Button>
              </div>
            </div>
          ) : null}

          <div className="grid items-start gap-4 xl:grid-cols-[1fr_1fr]">
            <PageSection title="Appearance" description="Choose Orion's theme and accent color.">
              <div className="space-y-3">
                <Select
                  label="Theme"
                  hint="Use system, dark, or light mode."
                  options={themeModeOptions}
                  value={themeMode}
                  onChange={(event) => void handleThemeModeChange(event.target.value as ThemeMode)}
                />

                <div className="space-y-2.5">
                  <div>
                    <div className="text-[12px] font-semibold text-(--text-primary)">Accent color</div>
                    <div className="mt-0.5 text-[11px] text-(--text-muted)">Used for buttons, highlights, and active states.</div>
                  </div>
                  <div className="grid gap-2.5 sm:grid-cols-2">
                    {accentPalettes.map((palette) => (
                      <button
                        key={palette.id}
                        type="button"
                        onClick={() => void handleAccentChange(palette.id)}
                        className={`rounded-lg border p-2.5 text-left transition ${
                          accentColor === palette.id
                            ? "border-(--accent-soft) bg-(--accent-surface)"
                            : "border-(--border-subtle) bg-white/5 hover:border-(--accent-soft) hover:bg-white/8"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="size-7 rounded-md border"
                            style={{
                              background: `linear-gradient(145deg, ${palette.accent}, ${palette.accentStrong})`,
                              borderColor: palette.accentSoft,
                            }}
                          />
                          <div>
                            <div className="text-sm font-semibold text-(--text-primary)">{palette.label}</div>
                            <div className="mt-0.5 text-xs leading-4 text-(--text-secondary)">{palette.description}</div>
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
              description="Default folder for Image Converter and PDF Tools results."
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
              <div className="space-y-3">
                <Input
                  label="Default output folder"
                  hint="If empty, Orion asks during export."
                  value={defaultOutputFolder}
                  placeholder="No default output folder set."
                  readOnly
                />
              </div>
            </PageSection>
          </div>

          <div className="grid items-start gap-4 xl:grid-cols-[1fr_1fr]">
            <PageSection
              title="Application"
              description="Basic Orion behavior."
              actions={
                <Button variant="outline" size="sm" leadingIcon={RefreshCw} onClick={handleResetSettings}>
                  Reset settings
                </Button>
              }
            >
              <div className="space-y-3">
                <Toggle
                  label="Remember window size and position"
                  hint="Reopen with the last window size."
                  checked={settings.windowPreferences.rememberWindowState}
                  onCheckedChange={(checked) => {
                    void updateWindowPreferences({ rememberWindowState: checked });
                    notify.success("Setting updated", checked ? "Window size will be remembered." : "Window size will no longer be remembered.");
                  }}
                />
                <Toggle
                  label="Restore maximized mode"
                  hint="Reopen maximized when previously maximized."
                  checked={settings.windowPreferences.restoreMaximizedWindow}
                  onCheckedChange={(checked) => {
                    void updateWindowPreferences({ restoreMaximizedWindow: checked });
                    notify.success("Setting updated", checked ? "Maximized mode will be restored." : "Maximized mode will no longer be restored.");
                  }}
                />
              </div>
            </PageSection>

            <PageSection title="About" description="App version and project information.">
              <div className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <AboutItem icon={AppWindow} label="App" value="Orion Utility Suite" />
                  <AboutItem icon={Tag} label="Version" value={bootstrap.data.version} />
                  <AboutItem icon={Scale} label="License" value="MIT License" />
                  <AboutItem icon={Cpu} label="Platform" value={bootstrap.data.platformLabel} />
                </div>

                <div className="flex flex-wrap gap-2">
                  {isDesktopRuntime && (
                    <Button
                      variant="outline"
                      size="sm"
                      leadingIcon={RefreshCw}
                      onClick={handleCheckForUpdates}
                      disabled={checkingUpdate}
                    >
                      {checkingUpdate ? "Checking..." : "Check for Updates"}
                    </Button>
                  )}
                  <a
                    href={githubProfileUrl}
                    onClick={(e) => {
                      e.preventDefault();
                      if (isDesktopRuntime) {
                        void openExternalUrl(githubProfileUrl);
                      } else {
                        window.open(githubProfileUrl, "_blank", "noopener,noreferrer");
                      }
                    }}
                    className="inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-[13px] font-semibold text-(--text-primary) transition hover:border-(--accent-soft) hover:bg-white/5 cursor-pointer"
                  >
                    <ExternalLink className="size-4" />
                    GitHub
                  </a>
                  <a
                    href="https://opensource.org/license/mit"
                    onClick={(e) => {
                      e.preventDefault();
                      const url = "https://opensource.org/license/mit";
                      if (isDesktopRuntime) {
                        void openExternalUrl(url);
                      } else {
                        window.open(url, "_blank", "noopener,noreferrer");
                      }
                    }}
                    className="inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-[13px] font-semibold text-(--text-primary) transition hover:border-(--accent-soft) hover:bg-white/5 cursor-pointer"
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
    <div className="rounded-lg border bg-black/10 p-2.5">
      <div className="flex items-center gap-2.5">
        <div className="flex size-8 items-center justify-center rounded-lg border bg-(--accent-surface) text-(--accent-strong)">
          <Icon className="size-4" />
        </div>
        <div>
          <div className="text-[11px] uppercase tracking-[0.08em] text-(--text-muted)">{label}</div>
          <div className="mt-0.5 text-sm font-semibold text-(--text-primary)">{value}</div>
        </div>
      </div>
    </div>
  );
}
