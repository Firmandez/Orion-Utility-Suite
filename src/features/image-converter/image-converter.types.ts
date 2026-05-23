import type { ImageConversionResponse, ImageOutputFormat } from "@/types/app";

export type ImageConverterStatus = "idle" | "loading" | "ready" | "error";

export interface ImageQueueItem {
  path: string;
  fileName: string;
  extension: string;
}

export interface ParsedResizeOptions {
  enabled: boolean;
  width?: number;
  height?: number;
}

export interface ImageConverterValidationResult {
  valid: boolean;
  message?: string;
}

export interface ImageConversionToastSummary {
  title: string;
  description: string;
  tone: "success" | "info" | "error";
}

export interface ImageConverterSnapshot {
  files: ImageQueueItem[];
  outputFolderPath?: string;
  outputFormat: ImageOutputFormat;
  qualityInput: string;
  resizeEnabled: boolean;
  resizeWidth: string;
  resizeHeight: string;
  compress: boolean;
  response?: ImageConversionResponse;
  errorMessage?: string;
}
