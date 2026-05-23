import type {
  ImageToPdfResponse,
  PdfMergeResponse,
  PdfSplitResponse,
  PdfToImagesResponse,
} from "@/types/app";

export type PdfToolOperation = "merge" | "split" | "image-to-pdf" | "pdf-to-images";
export type PdfToolsStatus = "idle" | "loading" | "ready" | "error";

export interface PdfQueueItem {
  path: string;
  fileName: string;
  extension: string;
}

export type PdfOperationResult =
  | { operation: "merge"; data: PdfMergeResponse }
  | { operation: "split"; data: PdfSplitResponse }
  | { operation: "image-to-pdf"; data: ImageToPdfResponse }
  | { operation: "pdf-to-images"; data: PdfToImagesResponse };
