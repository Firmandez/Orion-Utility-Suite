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
      message: "Add at least one image before running conversion.",
    };
  }

  if (!snapshot.outputFolderPath?.trim()) {
    return {
      valid: false,
      message: "Choose an output folder so result files have a clear destination.",
    };
  }

  if (snapshot.outputFormat === "jpg") {
    const quality = parsePositiveInteger(snapshot.qualityInput);

    if (!quality || quality < 1 || quality > 100) {
      return {
        valid: false,
        message: "JPG quality must be a number from 1 to 100.",
      };
    }
  }

  if (snapshot.resizeEnabled) {
    const resize = buildResizeOptions(snapshot);

    if (!resize.width && !resize.height) {
      return {
        valid: false,
        message: "Enter at least a width or height when resize is enabled.",
      };
    }
  }

  return { valid: true };
}

export function summarizeConversionToast(successCount: number, failedCount: number, totalFiles: number): ImageConversionToastSummary {
  if (totalFiles === 0) {
    return {
      title: "No files processed",
      description: "The conversion queue is empty, so no output was created.",
      tone: "info",
    };
  }

  if (failedCount === 0) {
    return {
      title: "Conversion finished",
      description: `${successCount} files converted to the selected format.`,
      tone: "success",
    };
  }

  if (successCount === 0) {
    return {
      title: "Conversion failed",
      description: `All ${failedCount} files failed. Check the file format or selected output folder.`,
      tone: "error",
    };
  }

  return {
    title: "Conversion finished with notes",
    description: `${successCount} files succeeded and ${failedCount} failed out of ${totalFiles} items.`,
    tone: "info",
  };
}

export function describeOutputMode(outputFormat: string, compress: boolean) {
  if (outputFormat === "jpg") {
    return "JPG is useful for smaller files with adjustable quality.";
  }

  return compress
    ? "PNG will use stronger compression to reduce file size."
    : "PNG will use lighter compression for faster processing.";
}
