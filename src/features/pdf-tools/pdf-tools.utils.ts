import type { ResultRow, SelectOption } from "@/types/app";
import type { PdfOperationResult, PdfQueueItem, PdfToolOperation } from "./pdf-tools.types";

export const PDF_TOOLS_PROGRESS_EVENT = "pdf-tools-progress";

const operationLabels: Record<PdfToolOperation, string> = {
  merge: "Merge PDF",
  split: "Split PDF",
  "image-to-pdf": "Image to PDF",
  "pdf-to-images": "PDF to Images",
};

export const pdfOperationOptions: SelectOption[] = [
  { value: "merge", label: "Merge PDF" },
  { value: "split", label: "Split PDF" },
  { value: "image-to-pdf", label: "Image to PDF" },
  { value: "pdf-to-images", label: "PDF to Images" },
];

export function getBaseName(path: string) {
  return path.split(/[/\\]/).pop() || path;
}

export function getExtension(path: string) {
  return getBaseName(path).split(".").pop()?.toLowerCase() || "";
}

export function isPdfOperationSingleFile(operation: PdfToolOperation) {
  return operation === "split" || operation === "pdf-to-images";
}

export function getAcceptedExtensions(operation: PdfToolOperation) {
  if (operation === "image-to-pdf") {
    return ["png", "jpg", "jpeg", "webp"];
  }

  return ["pdf"];
}

export function getOperationLabel(operation: PdfToolOperation) {
  return operationLabels[operation];
}

export function getDefaultOutputFileName(operation: PdfToolOperation) {
  if (operation === "image-to-pdf") {
    return "images-to-pdf.pdf";
  }

  return "merged.pdf";
}

export function getQueueDescription(operation: PdfToolOperation) {
  switch (operation) {
    case "merge":
      return "Tambahkan dua PDF atau lebih untuk digabungkan menjadi satu dokumen baru.";
    case "split":
      return "Pilih satu PDF sumber, lalu Orion akan memecahnya menjadi file per halaman.";
    case "image-to-pdf":
      return "Tambahkan beberapa gambar untuk disusun menjadi PDF multi-page.";
    case "pdf-to-images":
      return "Pilih satu PDF untuk mengecek kesiapan eksport halaman ke image.";
  }
}

export function getOperationHint(operation: PdfToolOperation) {
  switch (operation) {
    case "merge":
      return "Mendukung drag and drop banyak PDF sekaligus.";
    case "split":
      return "Hanya satu PDF dipakai untuk operasi split.";
    case "image-to-pdf":
      return "Mendukung PNG, JPG, JPEG, dan WEBP.";
    case "pdf-to-images":
      return "UI placeholder ini menyiapkan jalur integrasi pdfium-render berikutnya.";
  }
}

export function joinOutputPath(folderPath: string, fileName: string) {
  const trimmedFolder = folderPath.trim();
  const trimmedFileName = fileName.trim();

  if (!trimmedFolder || !trimmedFileName) {
    return "";
  }

  if (/[\\/]\s*$/.test(trimmedFolder)) {
    return `${trimmedFolder}${trimmedFileName}`;
  }

  const separator = trimmedFolder.includes("\\") ? "\\" : "/";
  return `${trimmedFolder}${separator}${trimmedFileName}`;
}

export function normalizeOutputFileName(value: string) {
  const cleaned = value.replace(/[<>:"/\\|?*\u0000-\u001F]/g, "").trim();
  return cleaned;
}

export function finalizeOutputFileName(value: string) {
  const cleaned = normalizeOutputFileName(value);

  if (!cleaned) {
    return "";
  }

  return cleaned.toLowerCase().endsWith(".pdf") ? cleaned : `${cleaned}.pdf`;
}

export function toQueueItems(paths: string[]): PdfQueueItem[] {
  return [...new Set(paths)].map((path) => ({
    path,
    fileName: getBaseName(path),
    extension: getExtension(path),
  }));
}

export function partitionPathsForOperation(paths: string[], operation: PdfToolOperation) {
  const allowed = new Set(getAcceptedExtensions(operation));
  const validPaths: string[] = [];
  const invalidPaths: string[] = [];

  for (const path of [...new Set(paths)]) {
    if (allowed.has(getExtension(path))) {
      validPaths.push(path);
    } else {
      invalidPaths.push(path);
    }
  }

  return { validPaths, invalidPaths };
}

export function moveQueueItem<T>(items: T[], fromIndex: number, toIndex: number) {
  if (
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= items.length ||
    toIndex >= items.length ||
    fromIndex === toIndex
  ) {
    return items;
  }

  const nextItems = [...items];
  const [movedItem] = nextItems.splice(fromIndex, 1);

  if (movedItem === undefined) {
    return items;
  }

  nextItems.splice(toIndex, 0, movedItem);
  return nextItems;
}

export function validatePdfOperation(
  operation: PdfToolOperation,
  files: PdfQueueItem[],
  outputFolderPath?: string,
  outputFileName?: string,
) {
  if (operation === "merge" && files.length < 2) {
    return "Tambahkan minimal dua PDF untuk menjalankan merge.";
  }

  if ((operation === "split" || operation === "pdf-to-images") && files.length !== 1) {
    return "Operasi ini membutuhkan tepat satu file PDF sumber.";
  }

  if (operation === "image-to-pdf" && files.length === 0) {
    return "Tambahkan minimal satu gambar sebelum membuat PDF.";
  }

  if (!outputFolderPath?.trim()) {
    return "Pilih output folder terlebih dahulu.";
  }

  if ((operation === "merge" || operation === "image-to-pdf") && !outputFileName?.trim()) {
    return "Isi nama file output PDF terlebih dahulu.";
  }

  if ((operation === "merge" || operation === "image-to-pdf") && !outputFileName?.toLowerCase().endsWith(".pdf")) {
    return "Nama file output harus menggunakan ekstensi .pdf.";
  }

  return undefined;
}

export function buildResultRows(result?: PdfOperationResult): ResultRow[] {
  if (!result) {
    return [];
  }

  switch (result.operation) {
    case "merge":
      return [
        { label: "Operation", value: "Merge PDF" },
        { label: "Output", value: result.data.outputPath },
        { label: "Source files", value: String(result.data.mergedFiles), mono: true },
        { label: "Total pages", value: String(result.data.totalPages), mono: true },
      ];
    case "split":
      return [
        { label: "Operation", value: "Split PDF" },
        { label: "Output dir", value: result.data.outputDir },
        { label: "Generated files", value: String(result.data.generatedFiles.length), mono: true },
        { label: "Total pages", value: String(result.data.totalPages), mono: true },
      ];
    case "image-to-pdf":
      return [
        { label: "Operation", value: "Image to PDF" },
        { label: "Output", value: result.data.outputPath },
        { label: "Source files", value: String(result.data.sourceFiles), mono: true },
        { label: "Total pages", value: String(result.data.totalPages), mono: true },
      ];
    case "pdf-to-images":
      return [
        { label: "Operation", value: "PDF to Images" },
        { label: "Output dir", value: result.data.outputDir },
        { label: "Status", value: result.data.status },
        { label: "Detected pages", value: String(result.data.totalPages), mono: true },
      ];
  }
}

export function buildCopyPayload(result?: PdfOperationResult) {
  if (!result) {
    return "";
  }

  switch (result.operation) {
    case "merge":
      return [
        "Operation: Merge PDF",
        `Output: ${result.data.outputPath}`,
        `Source files: ${result.data.mergedFiles}`,
        `Total pages: ${result.data.totalPages}`,
      ].join("\n");
    case "split":
      return [
        "Operation: Split PDF",
        `Output dir: ${result.data.outputDir}`,
        `Generated files: ${result.data.generatedFiles.length}`,
        `Total pages: ${result.data.totalPages}`,
        "",
        ...result.data.generatedFiles,
      ].join("\n");
    case "image-to-pdf":
      return [
        "Operation: Image to PDF",
        `Output: ${result.data.outputPath}`,
        `Source files: ${result.data.sourceFiles}`,
        `Total pages: ${result.data.totalPages}`,
      ].join("\n");
    case "pdf-to-images":
      return [
        "Operation: PDF to Images",
        `Output dir: ${result.data.outputDir}`,
        `Status: ${result.data.status}`,
        `Detected pages: ${result.data.totalPages}`,
        result.data.note ?? "",
      ]
        .filter(Boolean)
        .join("\n");
  }
}

export function summarizePdfToast(result: PdfOperationResult): {
  tone: "success" | "info";
  title: string;
  description: string;
} {
  switch (result.operation) {
    case "merge":
      return {
        tone: "success",
        title: "Merge selesai",
        description: `${result.data.mergedFiles} PDF digabungkan menjadi ${getBaseName(result.data.outputPath)}.`,
      };
    case "split":
      return {
        tone: "success",
        title: "Split selesai",
        description: `${result.data.generatedFiles.length} file halaman dibuat di folder output yang dipilih.`,
      };
    case "image-to-pdf":
      return {
        tone: "success",
        title: "Image to PDF selesai",
        description: `${result.data.sourceFiles} gambar disusun menjadi ${getBaseName(result.data.outputPath)}.`,
      };
    case "pdf-to-images":
      return {
        tone: "info",
        title: result.data.status === "placeholder" ? "PDF to Image belum aktif" : "PDF to Image selesai",
        description:
          result.data.note ??
          `${result.data.generatedFiles.length} gambar halaman dibuat di folder output yang dipilih.`,
      };
  }
}
