import { invoke } from "@tauri-apps/api/core";
import { appVersion } from "@/generated/app-version";
import type {
  ActiveWifiInterface,
  AppBootstrapPayload,
  ConvertImagesOptionsRequest,
  DnsLookupResponse,
  HashResultResponse,
  HttpStatusResponse,
  ImageConversionResponse,
  ImageToPdfResponse,
  LocalIpResponse,
  PdfMergeResponse,
  PdfMetadataResponse,
  PdfMetadataUpdateRequest,
  PdfSplitResponse,
  PdfToImagesResponse,
  PingHostResponse,
  PortCheckResponse,
  SubnetScanResponse,
  SystemInfoResponse,
  WifiNetwork,
  YtdlpAvailability,
  YtdlpDownloadOptions,
  YtdlpDownloadResult,
  YtdlpUpdateResult,
  YtdlpVideoInfo,
} from "@/types/app";

export const fallbackBootstrap: AppBootstrapPayload = {
  appName: "Orion Utility Suite",
  version: appVersion,
  backendMode: "Limited mode",
  platformLabel: "Browser mode",
  runtimeStatus: "Orion ready",
  offlineReady: true,
  modules: [
    { id: "qr-generator", title: "QR Generator", area: "QR Tools", status: "Ready" },
    { id: "image-converter", title: "Image Converter", area: "Image Tools", status: "Desktop only" },
    { id: "pdf-tools", title: "PDF Tools", area: "PDF Tools", status: "Desktop only" },
    { id: "text-utilities", title: "Text Utilities", area: "Text Tools", status: "Ready" },
    { id: "hash-checker", title: "Hash Checker", area: "File Checks", status: "Desktop only" },
    { id: "network-toolkit", title: "Network Toolkit", area: "Network Tools", status: "Desktop only" },
    { id: "developer-tools", title: "Advanced Tools", area: "Advanced Tools", status: "Ready" },
    { id: "youtube-downloader", title: "YouTube Downloader", area: "Media Tools", status: "Desktop only" },
    { id: "settings", title: "Settings", area: "Preferences", status: "Ready" }
  ]
};

export async function getAppBootstrap() {
  return invoke<AppBootstrapPayload>("bootstrap_app");
}

export async function getSystemInfo() {
  return invoke<SystemInfoResponse>("get_system_info");
}

export async function getLocalIp() {
  return invoke<LocalIpResponse>("get_local_ip");
}

export async function dnsLookup(domain: string) {
  return invoke<DnsLookupResponse>("dns_lookup", { domain });
}

export async function pingHost(host: string) {
  return invoke<PingHostResponse>("ping_host", { host });
}

export async function checkPort(host: string, port: number) {
  return invoke<PortCheckResponse>("check_port", { host, port });
}

export async function checkHttpStatus(url: string) {
  return invoke<HttpStatusResponse>("check_http_status", { url });
}

export async function mergePdfs(files: string[], outputPath: string) {
  return invoke<PdfMergeResponse>("merge_pdfs", { files, outputPath });
}

export async function splitPdf(file: string, outputDir: string) {
  return invoke<PdfSplitResponse>("split_pdf", { file, outputDir });
}

export async function imageToPdf(files: string[], outputPath: string) {
  return invoke<ImageToPdfResponse>("image_to_pdf", { files, outputPath });
}

export async function pdfToImages(file: string, outputDir: string) {
  return invoke<PdfToImagesResponse>("pdf_to_images", { file, outputDir });
}

export async function readPdfMetadata(file: string) {
  return invoke<PdfMetadataResponse>("read_pdf_metadata", { file });
}

export async function writePdfMetadata(payload: PdfMetadataUpdateRequest) {
  return invoke<PdfMetadataResponse>("write_pdf_metadata", { payload });
}

export async function clearPdfMetadata(file: string, outputPath: string) {
  return invoke<PdfMetadataResponse>("clear_pdf_metadata", { file, outputPath });
}

export async function generateHash(filePath: string) {
  return invoke<HashResultResponse>("generate_hash", { filePath });
}

export async function convertImages(options: ConvertImagesOptionsRequest) {
  return invoke<ImageConversionResponse>("convert_images", { options });
}

export async function scanSubnet() {
  return invoke<SubnetScanResponse>("scan_subnet");
}

export async function getWifiNetworks() {
  return invoke<WifiNetwork[]>("get_wifi_networks");
}

export async function getActiveWifiInterface() {
  return invoke<ActiveWifiInterface | null>("get_active_wifi_interface");
}

export async function openExternalUrl(url: string) {
  return invoke<void>("open_external_url", { url });
}

// --- YouTube Downloader (yt-dlp) ---

export async function checkYtdlpAvailable() {
  return invoke<YtdlpAvailability>("check_ytdlp_available");
}

export async function fetchYtdlpInfo(url: string) {
  return invoke<YtdlpVideoInfo>("fetch_ytdlp_info", { url });
}

export async function startYtdlpDownload(options: YtdlpDownloadOptions) {
  return invoke<YtdlpDownloadResult>("start_ytdlp_download", { options });
}

export async function cancelYtdlpDownload(downloadId: string) {
  return invoke<void>("cancel_ytdlp_download", { downloadId });
}

export async function updateYtdlp() {
  return invoke<YtdlpUpdateResult>("update_ytdlp");
}
