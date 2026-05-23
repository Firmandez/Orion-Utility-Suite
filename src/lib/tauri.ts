import { invoke } from "@tauri-apps/api/core";
import { appVersion } from "@/generated/app-version";
import type {
  AppBootstrapPayload,
  ConvertImagesOptionsRequest,
  DnsLookupResponse,
  HashResultResponse,
  HttpStatusResponse,
  ImageConversionResponse,
  ImageToPdfResponse,
  LocalIpResponse,
  PdfMergeResponse,
  PdfSplitResponse,
  PdfToImagesResponse,
  PingHostResponse,
  PortCheckResponse,
  SystemInfoResponse,
} from "@/types/app";

export const fallbackBootstrap: AppBootstrapPayload = {
  appName: "Orion Utility Suite",
  version: appVersion,
  backendMode: "Rust bridge placeholder",
  platformLabel: "Browser preview",
  runtimeStatus: "Stage 10 settings, polish, and build-readiness preview loaded",
  offlineReady: true,
  modules: [
    { id: "qr-generator", title: "QR Generator", area: "Data encoding", status: "Stage 3" },
    { id: "image-converter", title: "Image Converter", area: "Media tools", status: "Stage 6" },
    { id: "pdf-tools", title: "PDF Tools", area: "Document tools", status: "Stage 8" },
    { id: "text-utilities", title: "Text Utilities", area: "String transforms", status: "Stage 4" },
    { id: "hash-checker", title: "Hash Checker", area: "Integrity checks", status: "Stage 5" },
    { id: "network-toolkit", title: "Network Toolkit", area: "Local diagnostics", status: "Stage 7" },
    { id: "developer-tools", title: "Developer Tools", area: "Payload helpers", status: "Stage 9" },
    { id: "settings", title: "Settings", area: "Preferences", status: "Stage 10" }
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

export async function generateHash(filePath: string) {
  return invoke<HashResultResponse>("generate_hash", { filePath });
}

export async function convertImages(options: ConvertImagesOptionsRequest) {
  return invoke<ImageConversionResponse>("convert_images", { options });
}
