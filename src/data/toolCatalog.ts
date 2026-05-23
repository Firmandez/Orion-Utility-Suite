import {
  Files,
  Hash,
  ImagePlus,
  Network,
  QrCode,
  Settings2,
  TerminalSquare,
  Text,
} from "lucide-react";
import type { ToolDefinition } from "@/types/app";

export const toolCatalog: ToolDefinition[] = [
  {
    id: "qr-generator",
    path: "/qr-generator",
    title: "QR Generator",
    description: "Rancang workflow QR offline untuk URL, text, Wi-Fi, dan payload kontak.",
    summary: "Blueprint generator QR lokal dengan preset output, validasi payload, dan preview result pipeline.",
    category: "Generator",
    status: "Stage 3",
    accent: "from-cyan-500/25 via-sky-500/10 to-transparent",
    icon: QrCode,
    keywords: ["qr", "wifi", "url", "contact", "generator"],
  },
  {
    id: "image-converter",
    path: "/image-converter",
    title: "Image Converter",
    description: "Batch converter image lokal untuk PNG, JPG, dan WEBP dengan resize, quality, compression, dan output folder native.",
    summary: "Workspace image conversion berbasis Rust async dengan queue multi-file, progress batch, fault tolerance per-file, dan hasil output terstruktur.",
    category: "Converter",
    status: "Stage 6",
    accent: "from-emerald-500/25 via-teal-500/10 to-transparent",
    icon: ImagePlus,
    keywords: ["image", "resize", "webp", "png", "jpeg", "converter"],
  },
  {
    id: "pdf-tools",
    path: "/pdf-tools",
    title: "PDF Tools",
    description: "Utility PDF lokal untuk merge, split, image-to-PDF, dan jalur placeholder PDF to Image yang siap dikembangkan.",
    summary: "Workspace dokumen berbasis Rust dengan drag and drop, output folder picker, progress event, dan error handling aman untuk PDF corrupt.",
    category: "PDF",
    status: "Stage 8",
    accent: "from-amber-500/22 via-orange-500/10 to-transparent",
    icon: Files,
    keywords: ["pdf", "merge", "split", "extract", "document"],
  },
  {
    id: "text-utilities",
    path: "/text-utilities",
    title: "Text Utilities",
    description: "Utility string lokal untuk encode, decode, slugify, dan transform cepat.",
    summary: "Area kerja teks untuk eksperimen transformasi payload dengan UI modular dan hasil yang mudah dibaca.",
    category: "Text",
    status: "Stage 4",
    accent: "from-violet-500/20 via-sky-500/10 to-transparent",
    icon: Text,
    keywords: ["text", "base64", "slug", "encode", "decode", "regex"],
  },
  {
    id: "hash-checker",
    path: "/hash-checker",
    title: "Hash Checker",
    description: "Validasi integritas file lokal dengan digest MD5, SHA1, dan SHA256 berbasis Rust streaming.",
    summary: "Workspace hash checker dengan file picker native, progress real-time, compare state, dan copy digest individual.",
    category: "File Tools",
    status: "Stage 5",
    accent: "from-rose-500/18 via-orange-500/10 to-transparent",
    icon: Hash,
    keywords: ["hash", "sha256", "sha1", "md5", "checksum", "file"],
  },
  {
    id: "network-toolkit",
    path: "/network-toolkit",
    title: "Network Toolkit",
    description: "Toolkit jaringan lokal untuk local IP, DNS lookup, ping host, port checker, dan HTTP status checker.",
    summary: "Workspace network diagnostics berbasis Rust dengan validasi input, timeout eksplisit, hasil ringkas, dan copy result per tool.",
    category: "Network",
    status: "Stage 7",
    accent: "from-blue-500/22 via-cyan-500/10 to-transparent",
    icon: Network,
    keywords: ["dns", "ping", "ip", "network", "diagnostics"],
  },
  {
    id: "developer-tools",
    path: "/developer-tools",
    title: "Developer Tools",
    description: "Toolkit frontend lokal untuk UUID, timestamp, regex, JWT decode, dan konversi warna developer-friendly.",
    summary: "Workspace utilitas developer modular dengan copy/clear action, validasi input, dan hasil instan tanpa backend online.",
    category: "Developer",
    status: "Stage 9",
    accent: "from-slate-300/20 via-cyan-500/10 to-transparent",
    icon: TerminalSquare,
    keywords: ["developer", "uuid", "timestamp", "jwt", "regex", "color"],
  },
];

export const settingsTool: ToolDefinition = {
  id: "settings",
  path: "/settings",
  title: "Settings",
  description: "Control center persistent untuk tema, accent, output defaults, dan build readiness Orion.",
  summary: "Workspace preferensi berbasis Tauri Store untuk persistence native, fallback aman, dan polish lintas shell desktop.",
  category: "System",
  status: "Stage 10",
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
