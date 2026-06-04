import { open } from "@tauri-apps/plugin-dialog";
import { startTransition, useEffectEvent, useState } from "react";
import { notify } from "@/components/ui/Toast";
import { copyText } from "@/lib/clipboard";
import { clearPdfMetadata, readPdfMetadata, writePdfMetadata } from "@/lib/tauri";
import type { PdfMetadataResponse } from "@/types/app";

type MetadataStatus = "idle" | "reading" | "saving" | "clearing" | "ready" | "error";

interface PdfMetadataState {
  filePath?: string;
  fileName?: string;
  metadata?: PdfMetadataResponse;
  editTitle: string;
  editAuthor: string;
  editSubject: string;
  editKeywords: string;
  outputFolderPath?: string;
  status: MetadataStatus;
  errorMessage?: string;
  lastSavedPath?: string;
}

function getBaseName(path: string) {
  return path.split(/[/\\]/).pop() || path;
}

function getFileStem(path: string) {
  const base = getBaseName(path);
  const dotIndex = base.lastIndexOf(".");
  return dotIndex > 0 ? base.substring(0, dotIndex) : base;
}

function joinPath(folder: string, fileName: string) {
  const trimmed = folder.trim();
  if (!trimmed) return fileName;
  const sep = trimmed.includes("\\") ? "\\" : "/";
  return trimmed.endsWith(sep) ? `${trimmed}${fileName}` : `${trimmed}${sep}${fileName}`;
}

export function usePdfMetadata(isDesktopRuntime: boolean, defaultOutputFolder?: string) {
  const [state, setState] = useState<PdfMetadataState>({
    editTitle: "",
    editAuthor: "",
    editSubject: "",
    editKeywords: "",
    status: "idle",
  });

  const resolvedOutputFolder = state.outputFolderPath?.trim() || defaultOutputFolder?.trim() || "";

  const pickFile = useEffectEvent(async () => {
    if (!isDesktopRuntime) {
      notify.error("Desktop only", "PDF metadata editing requires the desktop app.");
      return;
    }

    const selection = await open({
      title: "Choose a PDF to read metadata",
      multiple: false,
      directory: false,
      filters: [{ name: "PDF documents", extensions: ["pdf"] }],
    });

    if (typeof selection !== "string") return;

    startTransition(() => {
      setState((current) => ({
        ...current,
        filePath: selection,
        fileName: getBaseName(selection),
        status: "reading",
        metadata: undefined,
        errorMessage: undefined,
        lastSavedPath: undefined,
      }));
    });

    try {
      const metadata = await readPdfMetadata(selection);
      startTransition(() => {
        setState((current) => ({
          ...current,
          metadata,
          editTitle: metadata.title || "",
          editAuthor: metadata.author || "",
          editSubject: metadata.subject || "",
          editKeywords: metadata.keywords || "",
          status: "ready",
          errorMessage: undefined,
        }));
      });
      notify.success("Metadata loaded", `Metadata read from ${getBaseName(selection)}.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      startTransition(() => {
        setState((current) => ({
          ...current,
          status: "error",
          errorMessage: message,
        }));
      });
      notify.error("Failed to read metadata", message);
    }
  });

  const readMetadata = useEffectEvent(async () => {
    if (!state.filePath) {
      notify.error("No file selected", "Choose a PDF file first.");
      return;
    }

    startTransition(() => {
      setState((current) => ({
        ...current,
        status: "reading",
        errorMessage: undefined,
      }));
    });

    try {
      const metadata = await readPdfMetadata(state.filePath);
      startTransition(() => {
        setState((current) => ({
          ...current,
          metadata,
          editTitle: metadata.title || "",
          editAuthor: metadata.author || "",
          editSubject: metadata.subject || "",
          editKeywords: metadata.keywords || "",
          status: "ready",
          errorMessage: undefined,
        }));
      });
      notify.success("Metadata refreshed", "PDF metadata has been re-read successfully.");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      startTransition(() => {
        setState((current) => ({
          ...current,
          status: "error",
          errorMessage: message,
        }));
      });
      notify.error("Failed to read metadata", message);
    }
  });

  const saveMetadataCopy = useEffectEvent(async () => {
    if (!state.filePath) {
      notify.error("No file selected", "Choose a PDF file first.");
      return;
    }

    if (!resolvedOutputFolder) {
      notify.error("No output folder", "Choose an output folder before saving.");
      return;
    }

    const stem = getFileStem(state.filePath);
    const outputPath = joinPath(resolvedOutputFolder, `${stem}-metadata-updated.pdf`);

    startTransition(() => {
      setState((current) => ({
        ...current,
        status: "saving",
        errorMessage: undefined,
      }));
    });

    try {
      const result = await writePdfMetadata({
        filePath: state.filePath,
        outputPath,
        title: state.editTitle,
        author: state.editAuthor,
        subject: state.editSubject,
        keywords: state.editKeywords,
        clearExisting: false,
      });

      startTransition(() => {
        setState((current) => ({
          ...current,
          metadata: result,
          status: "ready",
          errorMessage: undefined,
          lastSavedPath: outputPath,
        }));
      });
      notify.success("Metadata saved", `Updated PDF saved as ${getBaseName(outputPath)}.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      startTransition(() => {
        setState((current) => ({
          ...current,
          status: "error",
          errorMessage: message,
        }));
      });
      notify.error("Failed to save metadata", message);
    }
  });

  const clearMetadataAction = useEffectEvent(async () => {
    if (!state.filePath) {
      notify.error("No file selected", "Choose a PDF file first.");
      return;
    }

    if (!resolvedOutputFolder) {
      notify.error("No output folder", "Choose an output folder before clearing metadata.");
      return;
    }

    const stem = getFileStem(state.filePath);
    const outputPath = joinPath(resolvedOutputFolder, `${stem}-metadata-clean.pdf`);

    startTransition(() => {
      setState((current) => ({
        ...current,
        status: "clearing",
        errorMessage: undefined,
      }));
    });

    try {
      const result = await clearPdfMetadata(state.filePath, outputPath);

      startTransition(() => {
        setState((current) => ({
          ...current,
          metadata: result,
          editTitle: "",
          editAuthor: "",
          editSubject: "",
          editKeywords: "",
          status: "ready",
          errorMessage: undefined,
          lastSavedPath: outputPath,
        }));
      });
      notify.success("Metadata cleared", `Clean PDF saved as ${getBaseName(outputPath)}.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      startTransition(() => {
        setState((current) => ({
          ...current,
          status: "error",
          errorMessage: message,
        }));
      });
      notify.error("Failed to clear metadata", message);
    }
  });

  const pickOutputFolder = useEffectEvent(async () => {
    if (!isDesktopRuntime) {
      notify.error("Desktop only", "Folder selection requires the desktop app.");
      return;
    }

    const selection = await open({
      title: "Choose output folder for metadata operations",
      multiple: false,
      directory: true,
    });

    if (typeof selection === "string") {
      startTransition(() => {
        setState((current) => ({ ...current, outputFolderPath: selection }));
      });
      notify.success("Output folder selected", "Metadata output folder updated.");
    }
  });

  const copyOutputPath = useEffectEvent(async () => {
    if (!state.lastSavedPath) return;
    try {
      await copyText(state.lastSavedPath);
      notify.success("Path copied", "Output file path copied to clipboard.");
    } catch {
      notify.error("Copy failed", "Could not copy to clipboard.");
    }
  });

  const resetForm = useEffectEvent(() => {
    startTransition(() => {
      setState({
        editTitle: "",
        editAuthor: "",
        editSubject: "",
        editKeywords: "",
        status: "idle",
      });
    });
  });

  const isProcessing = state.status === "reading" || state.status === "saving" || state.status === "clearing";

  return {
    ...state,
    isDesktopRuntime,
    isProcessing,
    resolvedOutputFolder,
    outputFolderSource: state.outputFolderPath?.trim() ? "custom" : defaultOutputFolder?.trim() ? "default" : "unset",
    pickFile: () => void pickFile(),
    readMetadata: () => void readMetadata(),
    saveMetadataCopy: () => void saveMetadataCopy(),
    clearMetadata: () => void clearMetadataAction(),
    pickOutputFolder: () => void pickOutputFolder(),
    copyOutputPath: () => void copyOutputPath(),
    setEditTitle: (value: string) => startTransition(() => setState((c) => ({ ...c, editTitle: value }))),
    setEditAuthor: (value: string) => startTransition(() => setState((c) => ({ ...c, editAuthor: value }))),
    setEditSubject: (value: string) => startTransition(() => setState((c) => ({ ...c, editSubject: value }))),
    setEditKeywords: (value: string) => startTransition(() => setState((c) => ({ ...c, editKeywords: value }))),
    resetForm,
  };
}
