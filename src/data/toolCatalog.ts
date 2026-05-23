import {
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
    description: "Buat QR untuk URL, teks, Wi-Fi, WhatsApp, email, dan kontak.",
    summary: "Generator QR lokal dengan preset siap pakai, preview langsung, dan ekspor PNG/SVG.",
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
    description: "Ubah banyak gambar sekaligus ke JPG atau PNG, termasuk resize dan kompresi.",
    summary: "Konversi gambar lokal dengan antrean file, progress batch, dan ringkasan hasil.",
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
    description: "Gabungkan, pisahkan, dan ubah gambar menjadi PDF dari file lokal.",
    summary: "Alat PDF lokal dengan drag and drop, pilihan folder output, dan hasil yang mudah ditinjau.",
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
    description: "Format JSON, encode/decode Base64 dan URL, slugify, serta hitung teks.",
    summary: "Alat teks cepat dengan panel input-output dan hasil yang siap disalin.",
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
    description: "Cek integritas file dengan MD5, SHA1, dan SHA256.",
    summary: "Pemeriksa hash lokal dengan progress, pembanding hash, dan salin hasil per algoritma.",
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
    description: "Cek IP lokal, DNS, ping, port, dan status HTTP.",
    summary: "Alat jaringan lokal dengan validasi input, timeout aman, dan hasil ringkas.",
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
    description: "Buat UUID, ubah timestamp, uji regex, baca JWT, dan konversi warna.",
    summary: "Alat lanjutan untuk data kecil, validasi cepat, dan konversi praktis.",
    category: "Advanced",
    status: "Ready",
    accent: "from-slate-300/20 via-cyan-500/10 to-transparent",
    icon: Wrench,
    keywords: ["developer", "uuid", "timestamp", "jwt", "regex", "color"],
  },
];

export const settingsTool: ToolDefinition = {
  id: "settings",
  path: "/settings",
  title: "Settings",
  description: "Atur tampilan, folder output, preferensi aplikasi, dan informasi Orion.",
  summary: "Pengaturan aplikasi yang tersimpan otomatis dan mudah diubah kapan saja.",
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
