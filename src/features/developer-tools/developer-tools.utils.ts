import type {
  ColorConversionResult,
  HslColor,
  JwtDecodeResult,
  RegexMatchDetail,
  RegexTesterResult,
  RgbColor,
  TimestampConversionResult,
  UuidGenerationResult,
} from "./developer-tools.types";

const localTimeFormatter = new Intl.DateTimeFormat("id-ID", {
  dateStyle: "full",
  timeStyle: "long",
});

const allowedRegexFlags = new Set(["d", "g", "i", "m", "s", "u", "v", "y"]);

export function generateUuidValue(): UuidGenerationResult {
  const secureCrypto = globalThis.crypto;

  if (typeof secureCrypto?.randomUUID === "function") {
    return {
      value: secureCrypto.randomUUID(),
      source: "randomUUID",
    };
  }

  if (typeof secureCrypto?.getRandomValues === "function") {
    const bytes = new Uint8Array(16);
    secureCrypto.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;

    const hex = Array.from(bytes, (value) => value.toString(16).padStart(2, "0"));

    return {
      value: `${hex.slice(0, 4).join("")}-${hex.slice(4, 6).join("")}-${hex.slice(6, 8).join("")}-${hex.slice(8, 10).join("")}-${hex.slice(10, 16).join("")}`,
      source: "getRandomValues",
    };
  }

  throw new Error("Secure crypto API tidak tersedia di runtime ini.");
}

export function convertTimestampInput(input: string): TimestampConversionResult {
  const trimmed = input.trim();

  if (!trimmed) {
    return { state: "idle" };
  }

  let date: Date;
  let sourceLabel: string;
  const numericPattern = /^-?\d+(?:\.\d+)?$/;

  if (numericPattern.test(trimmed)) {
    const numericValue = Number(trimmed);

    if (!Number.isFinite(numericValue)) {
      return {
        state: "error",
        errorMessage: "Timestamp numerik tidak valid.",
      };
    }

    const digitCount = trimmed.replace(/[^0-9]/g, "").length;
    const looksLikeMilliseconds = Math.abs(numericValue) >= 1e11 || digitCount > 10;
    const epochMilliseconds = looksLikeMilliseconds ? numericValue : numericValue * 1000;
    date = new Date(epochMilliseconds);
    sourceLabel = looksLikeMilliseconds ? "Unix milliseconds" : "Unix seconds";
  } else {
    const parsed = Date.parse(trimmed);

    if (Number.isNaN(parsed)) {
      return {
        state: "error",
        errorMessage: "Masukkan Unix timestamp atau date string yang valid.",
      };
    }

    date = new Date(parsed);
    sourceLabel = "Date string";
  }

  if (Number.isNaN(date.getTime())) {
    return {
      state: "error",
      errorMessage: "Tanggal hasil parsing tidak valid.",
    };
  }

  const unixMilliseconds = String(date.getTime());
  const unixSeconds = String(Math.floor(date.getTime() / 1000));
  const isoString = date.toISOString();
  const utcTime = date.toUTCString();
  const localTime = localTimeFormatter.format(date);

  return {
    state: "ready",
    sourceLabel,
    localTime,
    utcTime,
    isoString,
    unixSeconds,
    unixMilliseconds,
    copyValue: JSON.stringify(
      {
        source: sourceLabel,
        localTime,
        utcTime,
        isoString,
        unixSeconds,
        unixMilliseconds,
      },
      null,
      2,
    ),
  };
}

export function getCurrentTimestampPreset() {
  return String(Date.now());
}

export function testRegexPattern(pattern: string, flags: string, sourceText: string): RegexTesterResult {
  const trimmedPattern = pattern.trim();

  if (!trimmedPattern && !sourceText.trim()) {
    return {
      state: "idle",
      matches: [],
    };
  }

  if (!trimmedPattern) {
    return {
      state: "error",
      matches: [],
      errorMessage: "Isi regex pattern terlebih dulu.",
    };
  }

  const normalizedFlagsResult = normalizeRegexFlags(flags);

  if ("errorMessage" in normalizedFlagsResult) {
    return {
      state: "error",
      matches: [],
      errorMessage: normalizedFlagsResult.errorMessage,
    };
  }

  if (!sourceText) {
    return {
      state: "idle",
      matches: [],
      usedFlags: normalizedFlagsResult.flags,
      searchMode: normalizedFlagsResult.flags.includes("g") || normalizedFlagsResult.flags.includes("y") ? "Multi-match scan" : "Single-match scan",
    };
  }

  try {
    const expression = new RegExp(trimmedPattern, normalizedFlagsResult.flags);
    const matches: RegexMatchDetail[] = [];
    const multiMatchMode = normalizedFlagsResult.flags.includes("g") || normalizedFlagsResult.flags.includes("y");

    if (multiMatchMode) {
      let nextMatch: RegExpExecArray | null;

      while ((nextMatch = expression.exec(sourceText)) !== null) {
        matches.push(buildRegexMatchDetail(nextMatch, matches.length + 1));

        if (nextMatch[0] === "") {
          expression.lastIndex += 1;
        }
      }
    } else {
      const firstMatch = expression.exec(sourceText);

      if (firstMatch) {
        matches.push(buildRegexMatchDetail(firstMatch, 1));
      }
    }

    return {
      state: "ready",
      usedFlags: normalizedFlagsResult.flags || "(none)",
      searchMode: multiMatchMode ? "Multi-match scan" : "Single-match scan",
      summary: matches.length > 0 ? `${matches.length} match ditemukan.` : "Tidak ada match yang ditemukan.",
      matches,
      copyValue: JSON.stringify(
        {
          pattern: trimmedPattern,
          flags: normalizedFlagsResult.flags,
          mode: multiMatchMode ? "multi" : "single",
          matches,
        },
        null,
        2,
      ),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Regex pattern tidak valid.";

    return {
      state: "error",
      matches: [],
      errorMessage: message,
    };
  }
}

export function decodeJwtToken(token: string): JwtDecodeResult {
  const trimmed = token.trim();

  if (!trimmed) {
    return { state: "idle" };
  }

  const segments = trimmed.split(".");

  if (segments.length < 2) {
    return {
      state: "error",
      errorMessage: "JWT minimal harus memiliki header dan payload yang dipisahkan titik.",
    };
  }

  try {
    const header = JSON.parse(decodeBase64UrlSegment(segments[0]));
    const payload = JSON.parse(decodeBase64UrlSegment(segments[1]));
    const headerPretty = JSON.stringify(header, null, 2);
    const payloadPretty = JSON.stringify(payload, null, 2);
    const signaturePresent = Boolean(segments[2]);

    return {
      state: "ready",
      headerPretty,
      payloadPretty,
      signaturePresent,
      segments: segments.length,
      copyValue: JSON.stringify(
        {
          header,
          payload,
          signaturePresent,
          segments: segments.length,
          verified: false,
        },
        null,
        2,
      ),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "JWT tidak bisa di-decode.";

    return {
      state: "error",
      errorMessage: message,
    };
  }
}

export function convertColorValue(input: string): ColorConversionResult {
  const trimmed = input.trim();

  if (!trimmed) {
    return { state: "idle" };
  }

  const hexColor = parseHexColor(trimmed);

  if (hexColor) {
    const hslColor = rgbToHsl(hexColor);
    const hex = formatHexColor(hexColor);
    const rgb = formatRgbColor(hexColor);
    const hsl = formatHslColor(hslColor);

    return {
      state: "ready",
      inputFormat: "HEX",
      hex,
      rgb,
      hsl,
      swatch: hex,
      copyValue: buildColorCopyValue("HEX", hex, rgb, hsl),
    };
  }

  const rgbColor = parseRgbColor(trimmed);

  if (rgbColor) {
    const hex = formatHexColor(rgbColor);
    const hsl = formatHslColor(rgbToHsl(rgbColor));
    const rgb = formatRgbColor(rgbColor);

    return {
      state: "ready",
      inputFormat: "RGB",
      hex,
      rgb,
      hsl,
      swatch: hex,
      copyValue: buildColorCopyValue("RGB", hex, rgb, hsl),
    };
  }

  const hslColor = parseHslColor(trimmed);

  if (hslColor) {
    const rgbColorFromHsl = hslToRgb(hslColor);
    const hex = formatHexColor(rgbColorFromHsl);
    const rgb = formatRgbColor(rgbColorFromHsl);
    const hsl = formatHslColor(hslColor);

    return {
      state: "ready",
      inputFormat: "HSL",
      hex,
      rgb,
      hsl,
      swatch: hex,
      copyValue: buildColorCopyValue("HSL", hex, rgb, hsl),
    };
  }

  return {
    state: "error",
    errorMessage: "Gunakan format warna yang valid seperti #0ea5e9, rgb(14, 165, 233), atau hsl(199, 89%, 48%).",
  };
}

function buildRegexMatchDetail(match: RegExpExecArray, matchNumber: number): RegexMatchDetail {
  return {
    matchNumber,
    index: match.index,
    value: match[0],
    captureGroups: match.slice(1).map((group) => group ?? "(undefined)"),
  };
}

function normalizeRegexFlags(flags: string): { flags: string } | { errorMessage: string } {
  const cleaned = flags.replace(/\s+/g, "");
  const uniqueFlags = new Set<string>();

  for (const character of cleaned) {
    if (!allowedRegexFlags.has(character)) {
      return {
        errorMessage: `Flag regex "${character}" tidak dikenali.`,
      };
    }

    if (uniqueFlags.has(character)) {
      return {
        errorMessage: `Flag regex "${character}" ditulis lebih dari sekali.`,
      };
    }

    uniqueFlags.add(character);
  }

  return {
    flags: Array.from(uniqueFlags).join(""),
  };
}

function decodeBase64UrlSegment(segment: string) {
  if (!segment) {
    throw new Error("JWT segment kosong.");
  }

  const normalized = segment.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  const binaryString = atob(padded);
  const bytes = Uint8Array.from(binaryString, (character) => character.charCodeAt(0));

  return new TextDecoder().decode(bytes);
}

function parseHexColor(input: string): RgbColor | null {
  const match = input.match(/^#?([a-f0-9]{3}|[a-f0-9]{6})$/i);

  if (!match) {
    return null;
  }

  const raw = match[1].length === 3 ? match[1].split("").map((value) => `${value}${value}`).join("") : match[1];

  return {
    r: Number.parseInt(raw.slice(0, 2), 16),
    g: Number.parseInt(raw.slice(2, 4), 16),
    b: Number.parseInt(raw.slice(4, 6), 16),
  };
}

function parseRgbColor(input: string): RgbColor | null {
  const match =
    input.match(/^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/i) ??
    input.match(/^(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})$/);

  if (!match) {
    return null;
  }

  const channels = match.slice(1).map((value) => Number.parseInt(value, 10));

  if (channels.some((value) => Number.isNaN(value) || value < 0 || value > 255)) {
    return null;
  }

  return {
    r: channels[0],
    g: channels[1],
    b: channels[2],
  };
}

function parseHslColor(input: string): HslColor | null {
  const match =
    input.match(/^hsl\(\s*(-?\d+(?:\.\d+)?)\s*,\s*(\d{1,3}(?:\.\d+)?)%\s*,\s*(\d{1,3}(?:\.\d+)?)%\s*\)$/i) ??
    input.match(/^(-?\d+(?:\.\d+)?)\s*,\s*(\d{1,3}(?:\.\d+)?)%\s*,\s*(\d{1,3}(?:\.\d+)?)%$/);

  if (!match) {
    return null;
  }

  const hue = Number.parseFloat(match[1]);
  const saturation = Number.parseFloat(match[2]);
  const lightness = Number.parseFloat(match[3]);

  if (
    Number.isNaN(hue) ||
    Number.isNaN(saturation) ||
    Number.isNaN(lightness) ||
    saturation < 0 ||
    saturation > 100 ||
    lightness < 0 ||
    lightness > 100
  ) {
    return null;
  }

  return {
    h: normalizeHue(hue),
    s: saturation,
    l: lightness,
  };
}

function rgbToHsl({ r, g, b }: RgbColor): HslColor {
  const red = r / 255;
  const green = g / 255;
  const blue = b / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const delta = max - min;
  let hue = 0;

  if (delta !== 0) {
    if (max === red) {
      hue = ((green - blue) / delta) % 6;
    } else if (max === green) {
      hue = (blue - red) / delta + 2;
    } else {
      hue = (red - green) / delta + 4;
    }
  }

  const lightness = (max + min) / 2;
  const saturation = delta === 0 ? 0 : delta / (1 - Math.abs(2 * lightness - 1));

  return {
    h: normalizeHue(hue * 60),
    s: Number((saturation * 100).toFixed(1)),
    l: Number((lightness * 100).toFixed(1)),
  };
}

function hslToRgb({ h, s, l }: HslColor): RgbColor {
  const hue = normalizeHue(h);
  const saturation = s / 100;
  const lightness = l / 100;
  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
  const segment = hue / 60;
  const secondary = chroma * (1 - Math.abs((segment % 2) - 1));
  const match = lightness - chroma / 2;
  let red = 0;
  let green = 0;
  let blue = 0;

  if (segment >= 0 && segment < 1) {
    red = chroma;
    green = secondary;
  } else if (segment < 2) {
    red = secondary;
    green = chroma;
  } else if (segment < 3) {
    green = chroma;
    blue = secondary;
  } else if (segment < 4) {
    green = secondary;
    blue = chroma;
  } else if (segment < 5) {
    red = secondary;
    blue = chroma;
  } else {
    red = chroma;
    blue = secondary;
  }

  return {
    r: Math.round((red + match) * 255),
    g: Math.round((green + match) * 255),
    b: Math.round((blue + match) * 255),
  };
}

function formatHexColor({ r, g, b }: RgbColor) {
  return `#${[r, g, b].map((value) => value.toString(16).padStart(2, "0")).join("").toUpperCase()}`;
}

function formatRgbColor({ r, g, b }: RgbColor) {
  return `rgb(${r}, ${g}, ${b})`;
}

function formatHslColor({ h, s, l }: HslColor) {
  const hue = Number.isInteger(h) ? h : Number(h.toFixed(1));
  const saturation = Number.isInteger(s) ? s : Number(s.toFixed(1));
  const lightness = Number.isInteger(l) ? l : Number(l.toFixed(1));

  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

function buildColorCopyValue(inputFormat: "HEX" | "RGB" | "HSL", hex: string, rgb: string, hsl: string) {
  return [`Input format: ${inputFormat}`, `HEX: ${hex}`, `RGB: ${rgb}`, `HSL: ${hsl}`].join("\n");
}

function normalizeHue(value: number) {
  return ((value % 360) + 360) % 360;
}
