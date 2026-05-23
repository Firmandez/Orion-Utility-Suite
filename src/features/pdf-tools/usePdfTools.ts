import { getCurrentWindow } from "@tauri-apps/api/window";
import { open } from "@tauri-apps/plugin-dialog";
import { startTransition, useEffect, useEffectEvent, useRef, useState } from "react";
import { notify } from "@/components/ui/Toast";
import { copyText } from "@/lib/clipboard";
import { imageToPdf, mergePdfs, pdfToImages, splitPdf } from "@/lib/tauri";
import type { AppBootstrapState, PdfToolsProgressResponse } from "@/types/app";
import type { PdfOperationResult, PdfQueueItem, PdfToolOperation, PdfToolsStatus } from "./pdf-tools.types";
import {
  buildCopyPayload,
  finalizeOutputFileName,
  getAcceptedExtensions,
  getDefaultOutputFileName,
  getOperationLabel,
  isPdfOperationSingleFile,
  joinOutputPath,
  moveQueueItem,
  partitionPathsForOperation,
  PDF_TOOLS_PROGRESS_EVENT,
  summarizePdfToast,
  toQueueItems,
  validatePdfOperation,
} from "./pdf-tools.utils";

interface PdfToolsState {
  operation: PdfToolOperation;
  files: PdfQueueItem[];
  outputFolderPath?: string;
  outputFileName: string;
  status: PdfToolsStatus;
  progressPercent: number;
  progressStatus: string;
  currentItemName?: string;
  isWindowDragActive: boolean;
  result?: PdfOperationResult;
  errorMessage?: string;
}

export function usePdfTools(bootstrap: AppBootstrapState, defaultOutputFolder?: string) {
  const isDesktopRuntime = bootstrap.source === "rust";
  const activeOperationRef = useRef<PdfToolOperation | undefined>(undefined);
  const [state, setState] = useState<PdfToolsState>({
    operation: "merge",
    files: [],
    outputFileName: getDefaultOutputFileName("merge"),
    status: "idle",
    progressPercent: 0,
    progressStatus: "Waiting for PDF operation setup",
    isWindowDragActive: false,
  });

  const resetForEdit = (current: PdfToolsState, files: PdfQueueItem[]) => ({
    ...current,
    files,
    status: "idle" as const,
    progressPercent: 0,
    progressStatus:
      files.length > 0
        ? `Queue ready with ${files.length} file${files.length === 1 ? "" : "s"}`
        : "Waiting for PDF operation setup",
    currentItemName: undefined,
    result: undefined,
    errorMessage: undefined,
  });

  const appendPaths = useEffectEvent((paths: string[], source: "picker" | "drop") => {
    const { validPaths, invalidPaths } = partitionPathsForOperation(paths, state.operation);

    if (validPaths.length === 0) {
      if (invalidPaths.length > 0) {
        notify.info(
          "Unsupported files skipped",
          `File diabaikan karena tidak cocok dengan operasi ${getOperationLabel(state.operation)}.`,
        );
      }
      return;
    }

    const nextPaths = (() => {
      if (isPdfOperationSingleFile(state.operation)) {
        return [validPaths[0]];
      }

      return [...new Set([...state.files.map((file) => file.path), ...validPaths])];
    })();

    startTransition(() => {
      setState((current) => resetForEdit(current, toQueueItems(nextPaths)));
    });

    notify.success(
      source === "drop" ? "Files added from drop" : "Files selected",
      `${nextPaths.length} file siap dipakai untuk ${getOperationLabel(state.operation).toLowerCase()}.`,
    );

    if (invalidPaths.length > 0) {
      notify.info(
        "Unsupported files skipped",
        `${invalidPaths.length} file diabaikan karena extension-nya tidak sesuai operasi aktif.`,
      );
    }

    if (isPdfOperationSingleFile(state.operation) && validPaths.length > 1) {
      notify.info(
        "Single-file mode active",
        "Operasi ini hanya memakai file valid pertama dari daftar yang Anda tambahkan.",
      );
    }
  });

  const setOperation = useEffectEvent((operation: PdfToolOperation) => {
    const { validPaths, invalidPaths } = partitionPathsForOperation(
      state.files.map((file) => file.path),
      operation,
    );
    const filteredPaths = isPdfOperationSingleFile(operation) ? validPaths.slice(0, 1) : validPaths;
    const nextOutputFileName =
      operation === "merge" || operation === "image-to-pdf"
        ? finalizeOutputFileName(state.outputFileName) || getDefaultOutputFileName(operation)
        : state.outputFileName;

    startTransition(() => {
      setState((current) => ({
        ...resetForEdit(current, toQueueItems(filteredPaths)),
        operation,
        outputFileName: nextOutputFileName,
      }));
    });

    if (invalidPaths.length > 0) {
      notify.info(
        "Queue adjusted",
        `${invalidPaths.length} file dikeluarkan dari queue karena tidak cocok dengan operasi baru.`,
      );
    }

    if (isPdfOperationSingleFile(operation) && validPaths.length > 1) {
      notify.info(
        "Queue reduced",
        "Operasi ini hanya menyimpan satu file sumber, jadi Orion mempertahankan file pertama yang valid.",
      );
    }
  });

  const pickFiles = useEffectEvent(async () => {
    if (!isDesktopRuntime) {
      notify.error("Desktop runtime required", "File picker native hanya tersedia saat Orion berjalan lewat Tauri desktop.");
      return;
    }

    const selection = await open({
      title: `Select files for ${getOperationLabel(state.operation)}`,
      multiple: !isPdfOperationSingleFile(state.operation),
      directory: false,
      filters: [
        {
          name: state.operation === "image-to-pdf" ? "Supported images" : "PDF documents",
          extensions: getAcceptedExtensions(state.operation),
        },
      ],
    });

    if (Array.isArray(selection) && selection.length > 0) {
      appendPaths(selection, "picker");
      return;
    }

    if (typeof selection === "string") {
      appendPaths([selection], "picker");
    }
  });

  const pickOutputFolder = useEffectEvent(async () => {
    if (!isDesktopRuntime) {
      notify.error("Desktop runtime required", "Folder picker native hanya tersedia saat Orion berjalan lewat Tauri desktop.");
      return;
    }

    const selection = await open({
      title: "Select output folder",
      multiple: false,
      directory: true,
    });

    if (typeof selection === "string") {
      startTransition(() => {
        setState((current) => ({
          ...resetForEdit(current, current.files),
          outputFolderPath: selection,
        }));
      });
      notify.success("Output folder selected", "Folder tujuan hasil PDF sudah diperbarui.");
    }
  });

  const removeFile = useEffectEvent((path: string) => {
    startTransition(() => {
      setState((current) => resetForEdit(current, current.files.filter((file) => file.path !== path)));
    });
  });

  const moveFileUp = useEffectEvent((path: string) => {
    startTransition(() => {
      setState((current) => {
        const currentIndex = current.files.findIndex((file) => file.path === path);

        if (currentIndex <= 0 || isPdfOperationSingleFile(current.operation)) {
          return current;
        }

        return resetForEdit(current, moveQueueItem(current.files, currentIndex, currentIndex - 1));
      });
    });
  });

  const moveFileDown = useEffectEvent((path: string) => {
    startTransition(() => {
      setState((current) => {
        const currentIndex = current.files.findIndex((file) => file.path === path);

        if (
          currentIndex === -1 ||
          currentIndex >= current.files.length - 1 ||
          isPdfOperationSingleFile(current.operation)
        ) {
          return current;
        }

        return resetForEdit(current, moveQueueItem(current.files, currentIndex, currentIndex + 1));
      });
    });
  });

  const clearQueue = useEffectEvent(() => {
    startTransition(() => {
      setState((current) => resetForEdit(current, []));
    });
    notify.info("Queue cleared", "Daftar file dan hasil operasi PDF dibersihkan.");
  });

  const setOutputFileName = useEffectEvent((value: string) => {
    startTransition(() => {
      setState((current) => ({
        ...resetForEdit(current, current.files),
        outputFileName: value,
      }));
    });
  });

  const normalizeOutputFile = useEffectEvent(() => {
    startTransition(() => {
      setState((current) => ({
        ...resetForEdit(current, current.files),
        outputFileName: finalizeOutputFileName(current.outputFileName),
      }));
    });
  });

  const copyPath = useEffectEvent(async (path: string, label: string) => {
    try {
      await copyText(path);
      notify.success("Path copied", `${label} berhasil disalin ke clipboard.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Clipboard tidak tersedia.";
      notify.error("Copy failed", message);
    }
  });

  const copyResultSummary = useEffectEvent(async () => {
    if (!state.result) {
      notify.error("Result not available", "Jalankan operasi PDF terlebih dahulu sebelum menyalin ringkasannya.");
      return;
    }

    try {
      await copyText(buildCopyPayload(state.result));
      notify.success("Summary copied", "Ringkasan hasil PDF berhasil disalin ke clipboard.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Clipboard tidak tersedia.";
      notify.error("Copy failed", message);
    }
  });

  const runOperation = useEffectEvent(async () => {
    if (!isDesktopRuntime) {
      notify.error("Desktop runtime required", "Operasi PDF backend Rust hanya tersedia saat Orion berjalan lewat Tauri desktop.");
      return;
    }

    const validation = validatePdfOperation(
      state.operation,
      state.files,
      state.outputFolderPath?.trim() || defaultOutputFolder?.trim() || undefined,
      state.outputFileName,
    );

    if (validation) {
      startTransition(() => {
        setState((current) => ({
          ...current,
          status: "error",
          errorMessage: validation,
        }));
      });
      notify.error("Konfigurasi belum valid", validation);
      return;
    }

    activeOperationRef.current = state.operation;
    startTransition(() => {
      setState((current) => ({
        ...current,
        status: "loading",
        progressPercent: 0,
        progressStatus: `Starting ${getOperationLabel(current.operation).toLowerCase()}`,
        currentItemName: undefined,
        result: undefined,
        errorMessage: undefined,
      }));
    });

    try {
      const result = await executePdfOperation(
        state.operation,
        state.files,
        state.outputFolderPath?.trim() || defaultOutputFolder?.trim() || "",
        state.outputFileName,
      );
      const toastSummary = summarizePdfToast(result);

      startTransition(() => {
        setState((current) => ({
          ...current,
          status: "ready",
          progressPercent: 100,
          progressStatus:
            result.operation === "pdf-to-images" && result.data.status === "placeholder"
              ? "PDF to Image placeholder prepared"
              : `${getOperationLabel(result.operation)} completed`,
          currentItemName: undefined,
          result,
          errorMessage: undefined,
        }));
      });

      const pushToast = toastSummary.tone === "success" ? notify.success : notify.info;
      pushToast(toastSummary.title, toastSummary.description);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Operasi PDF gagal diproses.";
      startTransition(() => {
        setState((current) => ({
          ...current,
          status: "error",
          progressStatus: `${getOperationLabel(current.operation)} failed`,
          errorMessage: message,
        }));
      });
      notify.error("Operasi PDF gagal", message);
    } finally {
      activeOperationRef.current = undefined;
    }
  });

  useEffect(() => {
    if (!isDesktopRuntime) {
      return;
    }

    const window = getCurrentWindow();
    let unlistenDragDrop: (() => void) | undefined;
    let unlistenProgress: (() => void) | undefined;

    void window.onDragDropEvent((event) => {
      if (event.payload.type === "enter" || event.payload.type === "over") {
        startTransition(() => {
          setState((current) => ({ ...current, isWindowDragActive: true }));
        });
        return;
      }

      if (event.payload.type === "leave") {
        startTransition(() => {
          setState((current) => ({ ...current, isWindowDragActive: false }));
        });
        return;
      }

      if (event.payload.type === "drop") {
        startTransition(() => {
          setState((current) => ({ ...current, isWindowDragActive: false }));
        });

        appendPaths(event.payload.paths, "drop");
      }
    }).then((unlisten) => {
      unlistenDragDrop = unlisten;
    });

    void window.listen<PdfToolsProgressResponse>(PDF_TOOLS_PROGRESS_EVENT, ({ payload }) => {
      const normalizedOperation = payload.operation.replace(/_/g, "-") as PdfToolOperation;

      if (!activeOperationRef.current || normalizedOperation !== activeOperationRef.current) {
        return;
      }

      startTransition(() => {
        setState((current) => ({
          ...current,
          progressPercent: payload.progressPercent,
          progressStatus: payload.status,
          currentItemName: payload.currentItemName || current.currentItemName,
        }));
      });
    }).then((unlisten) => {
      unlistenProgress = unlisten;
    });

    return () => {
      unlistenDragDrop?.();
      unlistenProgress?.();
    };
  }, [isDesktopRuntime]);

  return {
    ...state,
    isDesktopRuntime,
    outputPathPreview:
      state.operation === "merge" || state.operation === "image-to-pdf"
        ? joinOutputPath(
            state.outputFolderPath?.trim() || defaultOutputFolder?.trim() || "",
            finalizeOutputFileName(state.outputFileName),
          )
        : state.outputFolderPath?.trim() || defaultOutputFolder?.trim() || "",
    outputFolderPath: state.outputFolderPath?.trim() || defaultOutputFolder?.trim() || undefined,
    outputFolderSource: state.outputFolderPath?.trim() ? "custom" : defaultOutputFolder?.trim() ? "default" : "unset",
    isSingleFileOperation: isPdfOperationSingleFile(state.operation),
    pickFiles: () => void pickFiles(),
    pickOutputFolder: () => void pickOutputFolder(),
    setOperation: (operation: PdfToolOperation) => setOperation(operation),
    removeFile: (path: string) => removeFile(path),
    moveFileUp: (path: string) => moveFileUp(path),
    moveFileDown: (path: string) => moveFileDown(path),
    clearQueue: () => clearQueue(),
    setOutputFileName: (value: string) => setOutputFileName(value),
    normalizeOutputFile: () => normalizeOutputFile(),
    copyPath: (path: string, label: string) => void copyPath(path, label),
    copyResultSummary: () => void copyResultSummary(),
    runOperation: () => void runOperation(),
  };
}

async function executePdfOperation(
  operation: PdfToolOperation,
  files: PdfQueueItem[],
  outputFolderPath: string,
  outputFileName: string,
): Promise<PdfOperationResult> {
  const firstFile = files[0];

  switch (operation) {
    case "merge": {
      const data = await mergePdfs(
        files.map((file) => file.path),
        joinOutputPath(outputFolderPath, finalizeOutputFileName(outputFileName)),
      );
      return { operation, data };
    }
    case "split": {
      if (!firstFile) {
        throw new Error("PDF sumber untuk split tidak ditemukan.");
      }

      const data = await splitPdf(firstFile.path, outputFolderPath);
      return { operation, data };
    }
    case "image-to-pdf": {
      const data = await imageToPdf(
        files.map((file) => file.path),
        joinOutputPath(outputFolderPath, finalizeOutputFileName(outputFileName)),
      );
      return { operation, data };
    }
    case "pdf-to-images": {
      if (!firstFile) {
        throw new Error("PDF sumber untuk PDF to Image tidak ditemukan.");
      }

      const data = await pdfToImages(firstFile.path, outputFolderPath);
      return { operation, data };
    }
  }
}
