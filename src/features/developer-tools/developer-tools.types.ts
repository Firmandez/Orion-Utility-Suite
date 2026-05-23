export type DeveloperToolState = "idle" | "ready" | "error";

export interface UuidGenerationResult {
  value: string;
  source: "randomUUID" | "getRandomValues";
}

export interface TimestampConversionResult {
  state: DeveloperToolState;
  sourceLabel?: string;
  localTime?: string;
  utcTime?: string;
  isoString?: string;
  unixSeconds?: string;
  unixMilliseconds?: string;
  copyValue?: string;
  errorMessage?: string;
}

export interface RegexMatchDetail {
  matchNumber: number;
  index: number;
  value: string;
  captureGroups: string[];
}

export interface RegexTesterResult {
  state: DeveloperToolState;
  usedFlags?: string;
  searchMode?: string;
  summary?: string;
  matches: RegexMatchDetail[];
  copyValue?: string;
  errorMessage?: string;
}

export interface JwtDecodeResult {
  state: DeveloperToolState;
  headerPretty?: string;
  payloadPretty?: string;
  signaturePresent?: boolean;
  segments?: number;
  copyValue?: string;
  errorMessage?: string;
}

export interface RgbColor {
  r: number;
  g: number;
  b: number;
}

export interface HslColor {
  h: number;
  s: number;
  l: number;
}

export interface ColorConversionResult {
  state: DeveloperToolState;
  inputFormat?: "HEX" | "RGB" | "HSL";
  hex?: string;
  rgb?: string;
  hsl?: string;
  swatch?: string;
  copyValue?: string;
  errorMessage?: string;
}
