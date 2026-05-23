import { load, type Store } from "@tauri-apps/plugin-store";
import type {
  AccentColorId,
  AppSettings,
  ThemeMode,
  WindowPreferences,
  WindowStateSnapshot,
} from "@/types/app";

const STORE_FILE_NAME = "settings.json";

interface AccentPalette {
  id: AccentColorId;
  label: string;
  description: string;
  accent: string;
  accentStrong: string;
  accentSoft: string;
  accentSurface: string;
}

interface SettingsLoadResult {
  settings: AppSettings;
  errorMessage?: string;
}

export const githubProfileUrl = "https://github.com/Firmandez";
export const settingsStoreFileName = STORE_FILE_NAME;

export const accentPalettes: AccentPalette[] = [
  {
    id: "cyan",
    label: "Ion Cyan",
    description: "Terang, teknikal, dan dekat dengan visual default Orion.",
    accent: "#4dd8f6",
    accentStrong: "#18b8da",
    accentSoft: "rgba(77, 216, 246, 0.34)",
    accentSurface: "rgba(77, 216, 246, 0.14)",
  },
  {
    id: "emerald",
    label: "Circuit Emerald",
    description: "Nuansa hijau segar untuk workspace yang terasa produktif.",
    accent: "#34d399",
    accentStrong: "#10b981",
    accentSoft: "rgba(52, 211, 153, 0.34)",
    accentSurface: "rgba(52, 211, 153, 0.14)",
  },
  {
    id: "amber",
    label: "Signal Amber",
    description: "Lebih hangat untuk tool yang terasa operasional dan alert-friendly.",
    accent: "#fbbf24",
    accentStrong: "#f59e0b",
    accentSoft: "rgba(251, 191, 36, 0.34)",
    accentSurface: "rgba(251, 191, 36, 0.14)",
  },
  {
    id: "violet",
    label: "Pulse Violet",
    description: "Sedikit lebih ekspresif tanpa keluar dari karakter desktop utility.",
    accent: "#a78bfa",
    accentStrong: "#8b5cf6",
    accentSoft: "rgba(167, 139, 250, 0.34)",
    accentSurface: "rgba(167, 139, 250, 0.14)",
  },
  {
    id: "rose",
    label: "Radar Rose",
    description: "Aksen kontras tinggi untuk pengguna yang suka UI lebih berani.",
    accent: "#fb7185",
    accentStrong: "#f43f5e",
    accentSoft: "rgba(251, 113, 133, 0.34)",
    accentSurface: "rgba(251, 113, 133, 0.14)",
  },
];

export const defaultAppSettings: AppSettings = {
  themeMode: "system",
  accentColor: "cyan",
  defaultOutputFolder: "",
  windowPreferences: {
    rememberWindowState: true,
    restoreMaximizedWindow: true,
    lastWindowState: null,
  },
};

const storeDefaults: Record<string, unknown> = {
  ...defaultAppSettings,
};

let storePromise: Promise<Store> | null = null;
let cachedSettings: AppSettings = defaultAppSettings;

function isTauriRuntime() {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

async function getStore(forceCreateNew = false) {
  if (!isTauriRuntime()) {
    return null;
  }

  if (!storePromise || forceCreateNew) {
    storePromise = load(STORE_FILE_NAME, {
      autoSave: 250,
      defaults: storeDefaults,
      createNew: forceCreateNew,
      overrideDefaults: false,
    });
  }

  return storePromise;
}

export function getAccentPalette(accentColor: AccentColorId) {
  return accentPalettes.find((palette) => palette.id === accentColor) ?? accentPalettes[0];
}

export function mergeAppSettings(current: AppSettings, patch: Partial<AppSettings>): AppSettings {
  return sanitizeSettings({
    ...current,
    ...patch,
    windowPreferences: patch.windowPreferences
      ? {
          ...current.windowPreferences,
          ...patch.windowPreferences,
        }
      : current.windowPreferences,
  });
}

export async function loadSettings(): Promise<SettingsLoadResult> {
  if (!isTauriRuntime()) {
    cachedSettings = defaultAppSettings;
    return {
      settings: cachedSettings,
    };
  }

  try {
    const store = await getStore();

    if (!store) {
      cachedSettings = defaultAppSettings;
      return { settings: cachedSettings };
    }

    const [themeMode, accentColor, defaultOutputFolder, windowPreferences] = await Promise.all([
      store.get<ThemeMode>("themeMode"),
      store.get<AccentColorId>("accentColor"),
      store.get<string>("defaultOutputFolder"),
      store.get<WindowPreferences>("windowPreferences"),
    ]);

    const nextSettings = sanitizeSettings({
      themeMode,
      accentColor,
      defaultOutputFolder,
      windowPreferences,
    });

    cachedSettings = nextSettings;
    await writeSettings(store, nextSettings);

    return {
      settings: nextSettings,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Settings store tidak bisa dibaca.";

    console.warn("Orion settings fallback activated:", message);

    try {
      const recoveredStore = await getStore(true);

      if (recoveredStore) {
        await writeSettings(recoveredStore, defaultAppSettings);
      }
    } catch (recoveryError) {
      console.warn("Orion settings recovery failed:", recoveryError);
    }

    cachedSettings = defaultAppSettings;

    return {
      settings: cachedSettings,
      errorMessage: "File settings rusak atau tidak bisa dibaca. Orion memakai default aman dan menyiapkan ulang settings.json.",
    };
  }
}

export async function saveSettings(nextSettings: AppSettings) {
  const sanitized = sanitizeSettings(nextSettings);
  cachedSettings = sanitized;

  const store = await getStore();

  if (!store) {
    return sanitized;
  }

  await writeSettings(store, sanitized);
  return sanitized;
}

export async function updateSettings(patch: Partial<AppSettings>) {
  return saveSettings(mergeAppSettings(cachedSettings, patch));
}

export async function rememberWindowState(snapshot: WindowStateSnapshot) {
  const store = await getStore();

  if (!store) {
    return;
  }

  const nextSettings = sanitizeSettings({
    ...cachedSettings,
    windowPreferences: {
      ...cachedSettings.windowPreferences,
      lastWindowState: snapshot,
    },
  });

  cachedSettings = nextSettings;
  await store.set("windowPreferences", nextSettings.windowPreferences);
}

async function writeSettings(store: Store, settings: AppSettings) {
  await Promise.all([
    store.set("themeMode", settings.themeMode),
    store.set("accentColor", settings.accentColor),
    store.set("defaultOutputFolder", settings.defaultOutputFolder),
    store.set("windowPreferences", settings.windowPreferences),
  ]);
  await store.save();
}

function sanitizeSettings(value: Partial<AppSettings> | null | undefined): AppSettings {
  return {
    themeMode: sanitizeThemeMode(value?.themeMode),
    accentColor: sanitizeAccentColor(value?.accentColor),
    defaultOutputFolder: typeof value?.defaultOutputFolder === "string" ? value.defaultOutputFolder.trim() : "",
    windowPreferences: sanitizeWindowPreferences(value?.windowPreferences),
  };
}

function sanitizeThemeMode(value: unknown): ThemeMode {
  return value === "dark" || value === "light" || value === "system"
    ? value
    : defaultAppSettings.themeMode;
}

function sanitizeAccentColor(value: unknown): AccentColorId {
  return accentPalettes.some((palette) => palette.id === value)
    ? (value as AccentColorId)
    : defaultAppSettings.accentColor;
}

function sanitizeWindowPreferences(value: unknown): WindowPreferences {
  if (!value || typeof value !== "object") {
    return defaultAppSettings.windowPreferences;
  }

  const candidate = value as Partial<WindowPreferences>;

  return {
    rememberWindowState:
      typeof candidate.rememberWindowState === "boolean"
        ? candidate.rememberWindowState
        : defaultAppSettings.windowPreferences.rememberWindowState,
    restoreMaximizedWindow:
      typeof candidate.restoreMaximizedWindow === "boolean"
        ? candidate.restoreMaximizedWindow
        : defaultAppSettings.windowPreferences.restoreMaximizedWindow,
    lastWindowState: sanitizeWindowState(candidate.lastWindowState),
  };
}

function sanitizeWindowState(value: unknown): WindowStateSnapshot | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Partial<WindowStateSnapshot>;
  const width = Number(candidate.width);
  const height = Number(candidate.height);
  const x = Number(candidate.x);
  const y = Number(candidate.y);

  if (
    !Number.isFinite(width) ||
    !Number.isFinite(height) ||
    !Number.isFinite(x) ||
    !Number.isFinite(y) ||
    width < 320 ||
    height < 240
  ) {
    return null;
  }

  return {
    width,
    height,
    x,
    y,
    maximized: Boolean(candidate.maximized),
  };
}
