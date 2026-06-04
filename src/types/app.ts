import type { LucideIcon } from "lucide-react";

export type ThemeMode = "dark" | "light" | "system";
export type ResolvedThemeMode = "dark" | "light";
export type AccentColorId = "cyan" | "emerald" | "amber" | "violet" | "rose";
export type BootstrapSource = "rust" | "mock";
export type AsyncStatus = "loading" | "ready" | "error";
export type ToolCategory =
  | "Generator"
  | "Converter"
  | "PDF"
  | "Text"
  | "Network"
  | "Advanced"
  | "File Tools"
  | "System";
export type DashboardFilter = "All" | Exclude<ToolCategory, "System">;

export interface AppModuleSummary {
  id: string;
  title: string;
  area: string;
  status: string;
}

export interface AppBootstrapPayload {
  appName: string;
  version: string;
  backendMode: string;
  platformLabel: string;
  runtimeStatus: string;
  offlineReady: boolean;
  modules: AppModuleSummary[];
}

export interface AppBootstrapState {
  status: AsyncStatus;
  source: BootstrapSource;
  data: AppBootstrapPayload;
  errorMessage?: string;
}

export interface ToolDefinition {
  id: string;
  path: string;
  title: string;
  description: string;
  summary: string;
  category: ToolCategory;
  status: string;
  accent: string;
  icon: LucideIcon;
  keywords: string[];
}

export interface WindowStateSnapshot {
  width: number;
  height: number;
  x: number;
  y: number;
  maximized: boolean;
}

export interface WindowPreferences {
  rememberWindowState: boolean;
  restoreMaximizedWindow: boolean;
  lastWindowState: WindowStateSnapshot | null;
}

export interface AppSettings {
  themeMode: ThemeMode;
  accentColor: AccentColorId;
  defaultOutputFolder: string;
  windowPreferences: WindowPreferences;
}

export interface SettingsState {
  status: AsyncStatus;
  data: AppSettings;
  errorMessage?: string;
}

export interface SelectOption {
  label: string;
  value: string;
}

export interface ResultRow {
  label: string;
  value: string;
  mono?: boolean;
}

export interface SystemInfoResponse {
  os: string;
  architecture: string;
  appVersion: string;
}

export interface LocalIpResponse {
  localIp: string;
  subnetMask?: string;
  defaultGateway?: string;
  preferredDnsServer?: string;
  alternateDnsServer?: string;
  addressMode: string;
}

export interface DashboardSystemState {
  status: AsyncStatus;
  systemInfo?: SystemInfoResponse;
  localIp?: LocalIpResponse;
  errorMessage?: string;
}

export interface HashResultResponse {
  fileName: string;
  fileSize: number;
  md5: string;
  sha1: string;
  sha256: string;
}

export interface HashProgressResponse {
  filePath: string;
  fileName: string;
  bytesProcessed: number;
  totalBytes: number;
  progressPercent: number;
  status: string;
}

export type ImageOutputFormat = "jpg" | "png";
export type ImageConversionStatus = "success" | "failed";

export interface ImageResizeOptionsRequest {
  enabled: boolean;
  width?: number;
  height?: number;
}

export interface ConvertImagesOptionsRequest {
  inputPaths: string[];
  outputFolderPath: string;
  outputFormat: ImageOutputFormat;
  quality?: number;
  resize: ImageResizeOptionsRequest;
  compress: boolean;
}

export interface ImageConversionFileResultResponse {
  inputPath: string;
  outputPath?: string;
  status: ImageConversionStatus;
  errorMessage?: string;
}

export interface ImageConversionResponse {
  outputFolderPath: string;
  totalFiles: number;
  successCount: number;
  failedCount: number;
  results: ImageConversionFileResultResponse[];
}

export interface ImageConversionProgressResponse {
  currentFileName: string;
  currentFilePath: string;
  processedFiles: number;
  totalFiles: number;
  successCount: number;
  failedCount: number;
  progressPercent: number;
  status: string;
}

export interface DnsLookupResponse {
  domain: string;
  addresses: string[];
}

export interface PingHostResponse {
  host: string;
  reachable: boolean;
  exitCode?: number;
  durationMs: number;
  summary: string;
  output: string;
}

export interface PortCheckResponse {
  host: string;
  port: number;
  isOpen: boolean;
  durationMs: number;
  summary: string;
}

export interface HttpStatusResponse {
  url: string;
  finalUrl: string;
  statusCode: number;
  ok: boolean;
  summary: string;
}

export interface PdfMergeResponse {
  outputPath: string;
  mergedFiles: number;
  totalPages: number;
}

export interface PdfSplitResponse {
  outputDir: string;
  generatedFiles: string[];
  totalPages: number;
}

export interface ImageToPdfResponse {
  outputPath: string;
  sourceFiles: number;
  totalPages: number;
}

export interface PdfToImagesResponse {
  outputDir: string;
  generatedFiles: string[];
  totalPages: number;
  status: string;
  note?: string;
}

export interface PdfToolsProgressResponse {
  operation: string;
  currentItemName: string;
  processedItems: number;
  totalItems: number;
  progressPercent: number;
  status: string;
}

export interface DiscoveredDevice {
  ip: string;
  mac: string;
  deviceType: string;
  vendor: string;
  hostname: string;
  isAlive: boolean;
}

export interface SubnetScanResponse {
  subnet: string;
  localIp: string;
  devices: DiscoveredDevice[];
}

export interface WifiNetworkBssid {
  bssid: string;
  signal: number;
  channel: number;
  frequency: string;
  vendor: string;
}

export interface WifiNetwork {
  ssid: string;
  authentication: string;
  encryption: string;
  signal: number;
  band: string;
  bssids: WifiNetworkBssid[];
}

export interface ActiveWifiInterface {
  name: string;
  description: string;
  mac: string;
  state: string;
  ssid: string;
  bssid: string;
  signal: number;
  channel: number;
  receiveRate: number;
  transmitRate: number;
  vendor: string;
}

export interface PdfMetadataResponse {
  filePath: string;
  title?: string;
  author?: string;
  subject?: string;
  keywords?: string;
  creator?: string;
  producer?: string;
  creationDate?: string;
  modificationDate?: string;
}

export interface PdfMetadataUpdateRequest {
  filePath: string;
  outputPath: string;
  title?: string;
  author?: string;
  subject?: string;
  keywords?: string;
  clearExisting: boolean;
}

