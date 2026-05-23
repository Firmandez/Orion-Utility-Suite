import {
  createContext,
  startTransition,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  PhysicalPosition,
  PhysicalSize,
  getCurrentWindow,
} from "@tauri-apps/api/window";
import { toast } from "sonner";
import {
  defaultAppSettings,
  getAccentPalette,
  loadSettings,
  mergeAppSettings,
  rememberWindowState,
  saveSettings,
} from "@/services/settings-store";
import type {
  AccentColorId,
  AppSettings,
  ResolvedThemeMode,
  SettingsState,
  ThemeMode,
} from "@/types/app";

interface ShellContextValue {
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  settingsState: SettingsState;
  settings: AppSettings;
  themeMode: ThemeMode;
  resolvedTheme: ResolvedThemeMode;
  accentColor: AccentColorId;
  defaultOutputFolder: string;
  setThemeMode: (value: ThemeMode) => Promise<void>;
  setAccentColor: (value: AccentColorId) => Promise<void>;
  setDefaultOutputFolder: (value: string) => Promise<void>;
  updateWindowPreferences: (patch: Partial<AppSettings["windowPreferences"]>) => Promise<void>;
  resetAppSettings: () => Promise<void>;
  reloadSettings: () => Promise<void>;
  toggleTheme: () => Promise<void>;
}

const ShellContext = createContext<ShellContextValue | null>(null);

export function ShellProvider({ children }: { children: ReactNode }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [systemTheme, setSystemTheme] = useState<ResolvedThemeMode>(readSystemTheme);
  const [settingsState, setSettingsState] = useState<SettingsState>({
    status: "loading",
    data: defaultAppSettings,
  });
  const appliedWindowStateRef = useRef(false);

  const resolvedTheme = settingsState.data.themeMode === "system" ? systemTheme : settingsState.data.themeMode;
  const isDesktopRuntime = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return;
    }

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (event: MediaQueryListEvent) => {
      setSystemTheme(event.matches ? "dark" : "light");
    };

    setSystemTheme(mediaQuery.matches ? "dark" : "light");
    mediaQuery.addEventListener("change", handleChange);

    return () => {
      mediaQuery.removeEventListener("change", handleChange);
    };
  }, []);

  useEffect(() => {
    applyTheme(resolvedTheme);
  }, [resolvedTheme]);

  useEffect(() => {
    applyAccent(settingsState.data.accentColor);
  }, [settingsState.data.accentColor]);

  useEffect(() => {
    let active = true;

    async function hydrateSettings() {
      const result = await loadSettings();

      if (!active) {
        return;
      }

      startTransition(() => {
        setSettingsState({
          status: result.errorMessage ? "error" : "ready",
          data: result.settings,
          errorMessage: result.errorMessage,
        });
      });
    }

    void hydrateSettings();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!isDesktopRuntime || appliedWindowStateRef.current) {
      return;
    }

    const { rememberWindowState, restoreMaximizedWindow, lastWindowState } = settingsState.data.windowPreferences;

    if (!rememberWindowState || !lastWindowState) {
      appliedWindowStateRef.current = true;
      return;
    }

    appliedWindowStateRef.current = true;

    void applyWindowState(lastWindowState, restoreMaximizedWindow);
  }, [isDesktopRuntime, settingsState.data.windowPreferences]);

  useEffect(() => {
    if (!isDesktopRuntime || !settingsState.data.windowPreferences.rememberWindowState) {
      return;
    }

    const appWindow = getCurrentWindow();
    let debounceTimer: ReturnType<typeof setTimeout> | undefined;
    let unlistenResize: (() => void) | undefined;
    let unlistenMove: (() => void) | undefined;

    const scheduleSave = () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }

      debounceTimer = setTimeout(() => {
        void captureWindowState(appWindow);
      }, 320);
    };

    scheduleSave();

    void appWindow.onResized(() => {
      scheduleSave();
    }).then((unlisten) => {
      unlistenResize = unlisten;
    });

    void appWindow.onMoved(() => {
      scheduleSave();
    }).then((unlisten) => {
      unlistenMove = unlisten;
    });

    return () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }

      unlistenResize?.();
      unlistenMove?.();
    };
  }, [isDesktopRuntime, settingsState.data.windowPreferences.rememberWindowState]);

  const persistSettings = async (nextSettings: AppSettings) => {
    startTransition(() => {
      setSettingsState({
        status: "ready",
        data: nextSettings,
      });
    });

    try {
      const persisted = await saveSettings(nextSettings);

      startTransition(() => {
        setSettingsState({
          status: "ready",
          data: persisted,
        });
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Settings tidak bisa disimpan ke settings.json.";

      startTransition(() => {
        setSettingsState((current) => ({
          status: "error",
          data: current.data,
          errorMessage: message,
        }));
      });

      toast.error("Settings save failed", { description: message });
    }
  };

  const contextValue = useMemo<ShellContextValue>(
    () => ({
      searchQuery,
      setSearchQuery,
      settingsState,
      settings: settingsState.data,
      themeMode: settingsState.data.themeMode,
      resolvedTheme,
      accentColor: settingsState.data.accentColor,
      defaultOutputFolder: settingsState.data.defaultOutputFolder,
      setThemeMode: async (value) => {
        await persistSettings(
          mergeAppSettings(settingsState.data, {
            themeMode: value,
          }),
        );
      },
      setAccentColor: async (value) => {
        await persistSettings(
          mergeAppSettings(settingsState.data, {
            accentColor: value,
          }),
        );
      },
      setDefaultOutputFolder: async (value) => {
        await persistSettings(
          mergeAppSettings(settingsState.data, {
            defaultOutputFolder: value.trim(),
          }),
        );
      },
      updateWindowPreferences: async (patch) => {
        await persistSettings(
          mergeAppSettings(settingsState.data, {
            windowPreferences: {
              ...settingsState.data.windowPreferences,
              ...patch,
            },
          }),
        );
      },
      resetAppSettings: async () => {
        await persistSettings(defaultAppSettings);
      },
      reloadSettings: async () => {
        const result = await loadSettings();

        startTransition(() => {
          setSettingsState({
            status: result.errorMessage ? "error" : "ready",
            data: result.settings,
            errorMessage: result.errorMessage,
          });
        });
      },
      toggleTheme: async () => {
        const nextThemeMode: ThemeMode = resolvedTheme === "dark" ? "light" : "dark";

        await persistSettings(
          mergeAppSettings(settingsState.data, {
            themeMode: nextThemeMode,
          }),
        );
      },
    }),
    [resolvedTheme, searchQuery, settingsState],
  );

  return (
    <ShellContext.Provider value={contextValue}>
      {children}
    </ShellContext.Provider>
  );
}

export function useShell() {
  const context = useContext(ShellContext);

  if (!context) {
    throw new Error("useShell must be used within ShellProvider");
  }

  return context;
}

function readSystemTheme(): ResolvedThemeMode {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return "dark";
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(theme: ResolvedThemeMode) {
  document.documentElement.dataset.theme = theme;
}

function applyAccent(accentColor: AccentColorId) {
  const palette = getAccentPalette(accentColor);
  const root = document.documentElement;

  root.style.setProperty("--accent", palette.accent);
  root.style.setProperty("--accent-strong", palette.accentStrong);
  root.style.setProperty("--accent-soft", palette.accentSoft);
  root.style.setProperty("--accent-surface", palette.accentSurface);
}

async function applyWindowState(
  snapshot: NonNullable<AppSettings["windowPreferences"]["lastWindowState"]>,
  restoreMaximizedWindow: boolean,
) {
  try {
    const appWindow = getCurrentWindow();

    if (snapshot.maximized && restoreMaximizedWindow) {
      await appWindow.maximize();
      return;
    }

    await appWindow.unmaximize().catch(() => undefined);
    await appWindow.setSize(new PhysicalSize(snapshot.width, snapshot.height));
    await appWindow.setPosition(new PhysicalPosition(snapshot.x, snapshot.y));
  } catch (error) {
    console.warn("Orion window state restore skipped:", error);
  }
}

async function captureWindowState(appWindow: ReturnType<typeof getCurrentWindow>) {
  try {
    const [size, position, maximized] = await Promise.all([
      appWindow.innerSize(),
      appWindow.outerPosition(),
      appWindow.isMaximized(),
    ]);

    await rememberWindowState({
      width: size.width,
      height: size.height,
      x: position.x,
      y: position.y,
      maximized,
    });
  } catch (error) {
    console.warn("Orion window state capture skipped:", error);
  }
}
