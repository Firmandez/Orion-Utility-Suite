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
      return "Add two or more PDFs to merge them into one new document.";
    case "split":
      return "Choose one source PDF, then Orion will split it into one file per page.";
    case "image-to-pdf":
      return "Add multiple images to compose a multi-page PDF.";
    case "pdf-to-images":
      return "Choose one PDF to prepare page export to images.";
  }
}

export function getOperationHint(operation: PdfToolOperation) {
  switch (operation) {
    case "merge":
      return "Supports drag-and-drop for multiple PDFs at once.";
    case "split":
      return "Only one PDF is used for split operations.";
    case "image-to-pdf":
      return "Supports PNG, JPG, JPEG, and WEBP.";
    case "pdf-to-images":
      return "Only one PDF is used. Each page is exported as a PNG image.";
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
    return "Add at least two PDFs to run merge.";
  }

  if ((operation === "split" || operation === "pdf-to-images") && files.length !== 1) {
    return "This operation needs exactly one source PDF file.";
  }

  if (operation === "image-to-pdf" && files.length === 0) {
    return "Add at least one image before creating a PDF.";
  }

  if (!outputFolderPath?.trim()) {
    return "Choose an output folder first.";
  }

  if ((operation === "merge" || operation === "image-to-pdf") && !outputFileName?.trim()) {
    return "Enter the output PDF filename first.";
  }

  if ((operation === "merge" || operation === "image-to-pdf") && !outputFileName?.toLowerCase().endsWith(".pdf")) {
    return "The output filename must use the .pdf extension.";
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
        { label: "Output folder", value: result.data.outputDir },
        { label: "Files created", value: String(result.data.generatedFiles.length), mono: true },
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
        { label: "Output folder", value: result.data.outputDir },
        { label: "Images created", value: String(result.data.generatedFiles.length), mono: true },
        { label: "Total pages", value: String(result.data.totalPages), mono: true },
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
        `Output folder: ${result.data.outputDir}`,
        `Files created: ${result.data.generatedFiles.length}`,
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
        `Output folder: ${result.data.outputDir}`,
        `Images created: ${result.data.generatedFiles.length}`,
        `Total pages: ${result.data.totalPages}`,
        "",
        ...result.data.generatedFiles,
      ].join("\n");
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
        title: "Merge finished",
        description: `${result.data.mergedFiles} PDFs merged into ${getBaseName(result.data.outputPath)}.`,
      };
    case "split":
      return {
        tone: "success",
        title: "Split finished",
        description: `${result.data.generatedFiles.length} page files created in the selected output folder.`,
      };
    case "image-to-pdf":
      return {
        tone: "success",
        title: "Image to PDF finished",
        description: `${result.data.sourceFiles} images composed into ${getBaseName(result.data.outputPath)}.`,
      };
    case "pdf-to-images":
      return {
        tone: "success",
        title: "PDF to Images finished",
        description: `${result.data.generatedFiles.length} page images created in the selected output folder.`,
      };
  }
}
