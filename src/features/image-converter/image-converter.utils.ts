import type { SelectOption } from "@/types/app";
import type {
  ImageConversionToastSummary,
  ImageConverterSnapshot,
  ImageConverterValidationResult,
  ImageQueueItem,
  ParsedResizeOptions,
} from "./image-converter.types";

export const IMAGE_CONVERSION_PROGRESS_EVENT = "image-conversion-progress";
export const SUPPORTED_IMAGE_EXTENSIONS = ["png", "jpg", "jpeg", "webp"] as const;

export const imageOutputFormatOptions: SelectOption[] = [
  { value: "jpg", label: "JPG" },
  { value: "png", label: "PNG" },
];

export function getBaseName(path: string) {
  return path.split(/[/\\]/).pop() || path;
}

export function getExtension(path: string) {
  return getBaseName(path).split(".").pop()?.toLowerCase() || "";
}

export function isSupportedImagePath(path: string) {
  return SUPPORTED_IMAGE_EXTENSIONS.includes(getExtension(path) as (typeof SUPPORTED_IMAGE_EXTENSIONS)[number]);
}

export function deduplicateImagePaths(paths: string[]) {
  return [...new Set(paths)];
}

export function partitionImagePaths(paths: string[]) {
  const validPaths: string[] = [];
  const invalidPaths: string[] = [];

  for (const path of deduplicateImagePaths(paths)) {
    if (isSupportedImagePath(path)) {
      validPaths.push(path);
    } else {
      invalidPaths.push(path);
    }
  }

  return { validPaths, invalidPaths };
}

export function toQueueItems(paths: string[]): ImageQueueItem[] {
  return deduplicateImagePaths(paths).map((path) => ({
    path,
    fileName: getBaseName(path),
    extension: getExtension(path),
  }));
}

export function parsePositiveInteger(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return undefined;
  }

  const parsed = Number(trimmed);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    return undefined;
  }

  return parsed;
}

export function clampQualityInput(value: string) {
  const parsed = parsePositiveInteger(value);

  if (!parsed) {
    return "88";
  }

  return String(Math.min(Math.max(parsed, 1), 100));
}

export function buildResizeOptions(snapshot: Pick<ImageConverterSnapshot, "resizeEnabled" | "resizeWidth" | "resizeHeight">): ParsedResizeOptions {
  return {
    enabled: snapshot.resizeEnabled,
    width: parsePositiveInteger(snapshot.resizeWidth),
    height: parsePositiveInteger(snapshot.resizeHeight),
  };
}

export function validateImageConversion(snapshot: ImageConverterSnapshot): ImageConverterValidationResult {
  if (snapshot.files.length === 0) {
    return {
      valid: false,
      message: "Tambahkan minimal satu gambar sebelum menjalankan konversi.",
    };
  }

  if (!snapshot.outputFolderPath?.trim()) {
    return {
      valid: false,
      message: "Pilih folder output agar file hasil punya lokasi simpan yang jelas.",
    };
  }

  if (snapshot.outputFormat === "jpg") {
    const quality = parsePositiveInteger(snapshot.qualityInput);

    if (!quality || quality < 1 || quality > 100) {
      return {
        valid: false,
        message: "JPG quality harus berupa angka 1 sampai 100.",
      };
    }
  }

  if (snapshot.resizeEnabled) {
    const resize = buildResizeOptions(snapshot);

    if (!resize.width && !resize.height) {
      return {
        valid: false,
        message: "Isi minimal width atau height saat resize diaktifkan.",
      };
    }
  }

  return { valid: true };
}

export function summarizeConversionToast(successCount: number, failedCount: number, totalFiles: number): ImageConversionToastSummary {
  if (totalFiles === 0) {
    return {
      title: "Tidak ada file diproses",
      description: "Queue conversion kosong, jadi tidak ada output yang dibuat.",
      tone: "info",
    };
  }

  if (failedCount === 0) {
    return {
      title: "Konversi selesai",
      description: `${successCount} file berhasil dikonversi ke format pilihan.`,
      tone: "success",
    };
  }

  if (successCount === 0) {
    return {
      title: "Konversi gagal",
      description: `Semua ${failedCount} file gagal diproses. Cek format file atau folder output yang dipilih.`,
      tone: "error",
    };
  }

  return {
    title: "Konversi selesai dengan catatan",
    description: `${successCount} file sukses dan ${failedCount} file gagal dari total ${totalFiles} item.`,
    tone: "info",
  };
}

export function describeOutputMode(outputFormat: string, compress: boolean) {
  if (outputFormat === "jpg") {
    return "JPG cocok untuk ukuran file lebih kecil dengan kualitas yang bisa diatur.";
  }

  return compress
    ? "PNG akan dikompresi lebih kuat agar ukuran file lebih hemat."
    : "PNG memakai kompresi ringan agar proses lebih cepat.";
}
