import {
  Download,
  Files,
  Hash,
  ImagePlus,
  Network,
  QrCode,
  Settings2,
  Text,
  Wrench,
} from "lucide-react";
import type { ToolDefinition } from "@/types/app";

export const toolCatalog: ToolDefinition[] = [
  {
    id: "qr-generator",
    path: "/qr-generator",
    title: "QR Generator",
    description: "Create QR codes for URLs, text, Wi-Fi, WhatsApp, email, and contacts.",
    summary: "Local QR generator with ready-to-use presets, live preview, and PNG/SVG export.",
    category: "Generator",
    status: "Ready",
    accent: "from-cyan-500/25 via-sky-500/10 to-transparent",
    icon: QrCode,
    keywords: ["qr", "wifi", "url", "contact", "generator"],
  },
  {
    id: "image-converter",
    path: "/image-converter",
    title: "Image Converter",
    description: "Convert multiple images to JPG or PNG at once, with resize and compression.",
    summary: "Local image converter with file queue, batch progress, and result summary.",
    category: "Converter",
    status: "Ready",
    accent: "from-emerald-500/25 via-teal-500/10 to-transparent",
    icon: ImagePlus,
    keywords: ["image", "resize", "webp", "png", "jpeg", "converter"],
  },
  {
    id: "pdf-tools",
    path: "/pdf-tools",
    title: "PDF Tools",
    description: "Merge, split, and convert images into PDF from local files.",
    summary: "Local PDF tools with drag-and-drop, output folder selection, and easy review.",
    category: "PDF",
    status: "Ready",
    accent: "from-amber-500/22 via-orange-500/10 to-transparent",
    icon: Files,
    keywords: ["pdf", "merge", "split", "extract", "document"],
  },
  {
    id: "text-utilities",
    path: "/text-utilities",
    title: "Text Utilities",
    description: "Format JSON, encode/decode Base64 and URL, slugify, and count text.",
    summary: "Quick text tools with input-output panels and copy-ready results.",
    category: "Text",
    status: "Ready",
    accent: "from-violet-500/20 via-sky-500/10 to-transparent",
    icon: Text,
    keywords: ["text", "base64", "slug", "encode", "decode", "regex"],
  },
  {
    id: "hash-checker",
    path: "/hash-checker",
    title: "Hash Checker",
    description: "Verify file integrity with MD5, SHA1, and SHA256.",
    summary: "Local hash checker with progress, hash comparison, and per-algorithm copy.",
    category: "File Tools",
    status: "Ready",
    accent: "from-rose-500/18 via-orange-500/10 to-transparent",
    icon: Hash,
    keywords: ["hash", "sha256", "sha1", "md5", "checksum", "file"],
  },
  {
    id: "network-toolkit",
    path: "/network-toolkit",
    title: "Network Toolkit",
    description: "Check local IP, DNS, ping, port, and HTTP status.",
    summary: "Local network tools with input validation, safe timeouts, and compact results.",
    category: "Network",
    status: "Ready",
    accent: "from-blue-500/22 via-cyan-500/10 to-transparent",
    icon: Network,
    keywords: ["dns", "ping", "ip", "network", "diagnostics"],
  },
  {
    id: "developer-tools",
    path: "/developer-tools",
    title: "Advanced Tools",
    description: "Generate UUIDs, convert timestamps, test regex, decode JWT, and convert colors.",
    summary: "Advanced tools for quick validation, data generation, and conversion.",
    category: "Advanced",
    status: "Ready",
    accent: "from-slate-300/20 via-cyan-500/10 to-transparent",
    icon: Wrench,
    keywords: ["developer", "uuid", "timestamp", "jwt", "regex", "color"],
  },
  {
    id: "youtube-downloader",
    path: "/youtube-downloader",
    title: "YouTube Downloader",
    description: "Download video or audio from YouTube using yt-dlp.",
    summary: "Local YouTube downloader with format selection, progress tracking, and yt-dlp integration.",
    category: "Converter",
    status: "Ready",
    accent: "from-red-500/22 via-rose-500/10 to-transparent",
    icon: Download,
    keywords: ["youtube", "video", "audio", "download", "yt-dlp", "mp4", "mp3"],
  },
];

export const settingsTool: ToolDefinition = {
  id: "settings",
  path: "/settings",
  title: "Settings",
  description: "Customize appearance, output folder, app preferences, and Orion info.",
  summary: "App settings that auto-save and are easy to change anytime.",
  category: "System",
  status: "Ready",
  accent: "from-indigo-500/20 via-sky-500/10 to-transparent",
  icon: Settings2,
  keywords: ["settings", "preferences", "theme", "system"],
};

export function getToolById(id: string) {
  const match = [...toolCatalog, settingsTool].find((tool) => tool.id === id);

  if (!match) {
    throw new Error(`Unknown tool id: ${id}`);
  }

  return match;
}
