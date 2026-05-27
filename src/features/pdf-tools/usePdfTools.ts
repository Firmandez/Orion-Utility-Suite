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
    progressStatus: "Waiting for PDF settings",
    isWindowDragActive: false,
  });

  const resetForEdit = (current: PdfToolsState, files: PdfQueueItem[]) => ({
    ...current,
    files,
    status: "idle" as const,
    progressPercent: 0,
    progressStatus:
      files.length > 0
        ? `${files.length} files ready to process`
        : "Waiting for PDF settings",
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
          `Files were ignored because they do not match the ${getOperationLabel(state.operation)} operation.`,
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
      source === "drop" ? "Dropped files added" : "Files selected",
      `${nextPaths.length} files ready for ${getOperationLabel(state.operation).toLowerCase()}.`,
    );

    if (invalidPaths.length > 0) {
      notify.info(
        "Unsupported files skipped",
        `${invalidPaths.length} files were ignored because their extensions do not match the active operation.`,
      );
    }

    if (isPdfOperationSingleFile(state.operation) && validPaths.length > 1) {
      notify.info(
        "Single-file mode active",
        "This operation only uses the first valid file from the list you added.",
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
        `${invalidPaths.length} files were removed from the queue because they do not match the new operation.`,
      );
    }

    if (isPdfOperationSingleFile(operation) && validPaths.length > 1) {
      notify.info(
        "Queue trimmed",
        "This operation only keeps one source file, so Orion kept the first valid file.",
      );
    }
  });

  const pickFiles = useEffectEvent(async () => {
    if (!isDesktopRuntime) {
      notify.error("Open the desktop app", "File selection is available when Orion is opened as a desktop app.");
      return;
    }

    const selection = await open({
      title: `Choose files for ${getOperationLabel(state.operation)}`,
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
      notify.error("Open the desktop app", "Folder selection is available when Orion is opened as a desktop app.");
      return;
    }

    const selection = await open({
      title: "Choose output folder",
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
      notify.success("Output folder selected", "The PDF result destination folder has been updated.");
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
    notify.info("Queue cleared", "File list and PDF operation results have been cleared.");
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
      notify.success("Path copied", `${label} copied to the clipboard.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Clipboard is not available.";
      notify.error("Copy failed", message);
    }
  });

  const copyResultSummary = useEffectEvent(async () => {
    if (!state.result) {
      notify.error("Result not available", "Run a PDF operation before copying the summary.");
      return;
    }

    try {
      await copyText(buildCopyPayload(state.result));
      notify.success("Summary copied", "PDF result summary copied to the clipboard.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Clipboard is not available.";
      notify.error("Copy failed", message);
    }
  });

  const runOperation = useEffectEvent(async () => {
    if (!isDesktopRuntime) {
      notify.error("Open the desktop app", "PDF operations are available when Orion is opened as a desktop app.");
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
      notify.error("Configuration is not valid", validation);
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
          progressStatus: `${getOperationLabel(result.operation)} finished`,
          currentItemName: undefined,
          result,
          errorMessage: undefined,
        }));
      });

      const pushToast = toastSummary.tone === "success" ? notify.success : notify.info;
      pushToast(toastSummary.title, toastSummary.description);
    } catch (error) {
      const message = error instanceof Error ? error.message : "PDF operation could not be processed.";
      startTransition(() => {
        setState((current) => ({
          ...current,
          status: "error",
          progressStatus: `${getOperationLabel(current.operation)} failed`,
          errorMessage: message,
        }));
      });
      notify.error("PDF operation failed", message);
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
        throw new Error("Source PDF for split was not found.");
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
        throw new Error("Source PDF for PDF to Images was not found.");
      }

      const data = await pdfToImages(firstFile.path, outputFolderPath);
      return { operation, data };
    }
  }
}
