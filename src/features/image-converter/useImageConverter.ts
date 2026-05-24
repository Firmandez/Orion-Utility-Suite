import { getCurrentWindow } from "@tauri-apps/api/window";
import { open } from "@tauri-apps/plugin-dialog";
import { startTransition, useEffect, useEffectEvent, useState } from "react";
import { notify } from "@/components/ui/Toast";
import { copyText } from "@/lib/clipboard";
import { convertImages } from "@/lib/tauri";
import type {
  AppBootstrapState,
  ConvertImagesOptionsRequest,
  ImageConversionProgressResponse,
  ImageConversionResponse,
} from "@/types/app";
import type { ImageConverterStatus, ImageQueueItem } from "./image-converter.types";
import {
  buildResizeOptions,
  clampQualityInput,
  deduplicateImagePaths,
  describeOutputMode,
  IMAGE_CONVERSION_PROGRESS_EVENT,
  partitionImagePaths,
  summarizeConversionToast,
  toQueueItems,
  validateImageConversion,
} from "./image-converter.utils";

interface ImageConverterState {
  files: ImageQueueItem[];
  outputFolderPath?: string;
  outputFormat: "jpg" | "png";
  qualityInput: string;
  resizeEnabled: boolean;
  resizeWidth: string;
  resizeHeight: string;
  compress: boolean;
  status: ImageConverterStatus;
  progressPercent: number;
  progressStatus: string;
  currentFileName?: string;
  isWindowDragActive: boolean;
  response?: ImageConversionResponse;
  errorMessage?: string;
}

export function useImageConverter(bootstrap: AppBootstrapState, defaultOutputFolder?: string) {
  const isDesktopRuntime = bootstrap.source === "rust";
  const [state, setState] = useState<ImageConverterState>({
    files: [],
    outputFormat: "jpg",
    qualityInput: "88",
    resizeEnabled: false,
    resizeWidth: "",
    resizeHeight: "",
    compress: true,
    status: "idle",
    progressPercent: 0,
    progressStatus: "Waiting for images",
    isWindowDragActive: false,
  });

  const appendPaths = useEffectEvent((paths: string[], source: "picker" | "drop") => {
    const { validPaths, invalidPaths } = partitionImagePaths(paths);

    if (validPaths.length > 0) {
      startTransition(() => {
        setState((current) => {
          const nextPaths = deduplicateImagePaths([
            ...current.files.map((file) => file.path),
            ...validPaths,
          ]);

          return {
            ...current,
            files: toQueueItems(nextPaths),
            status: current.status === "loading" ? current.status : "idle",
            progressPercent: current.status === "loading" ? current.progressPercent : 0,
            progressStatus:
              current.status === "loading"
                ? current.progressStatus
                : `${nextPaths.length} images ready to process`,
            response: current.status === "loading" ? current.response : undefined,
            errorMessage: undefined,
          };
        });
      });

      notify.success(
        source === "drop" ? "Dropped images added" : "Images selected",
        `${validPaths.length} files added to the conversion queue.`,
      );
    }

    if (invalidPaths.length > 0) {
      notify.info(
        "Unsupported files skipped",
        `${invalidPaths.length} files were ignored because they are not PNG, JPG, JPEG, or WEBP.`,
      );
    }
  });

  const pickImages = useEffectEvent(async () => {
    if (!isDesktopRuntime) {
      notify.error("Open the desktop app", "File selection is available when Orion is opened as a desktop app.");
      return;
    }

    const selection = await open({
      title: "Choose images for batch conversion",
      multiple: true,
      directory: false,
      filters: [
        {
          name: "Supported images",
          extensions: ["png", "jpg", "jpeg", "webp"],
        },
      ],
    });

    if (Array.isArray(selection) && selection.length > 0) {
      appendPaths(selection, "picker");
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
          ...current,
          outputFolderPath: selection,
          errorMessage: undefined,
        }));
      });
      notify.success("Output folder selected", "The conversion destination folder has been updated.");
    }
  });

  const removeFile = useEffectEvent((path: string) => {
    startTransition(() => {
      setState((current) => {
        const nextFiles = current.files.filter((file) => file.path !== path);

        return {
          ...current,
          files: nextFiles,
          status: "idle",
          progressPercent: 0,
          progressStatus:
            nextFiles.length > 0
              ? `${nextFiles.length} images ready to process`
              : "Waiting for images",
          response: undefined,
          errorMessage: undefined,
        };
      });
    });
  });

  const clearQueue = useEffectEvent(() => {
    startTransition(() => {
      setState((current) => ({
        ...current,
        files: [],
        status: "idle",
        progressPercent: 0,
        progressStatus: "Waiting for images",
        currentFileName: undefined,
        response: undefined,
        errorMessage: undefined,
      }));
    });
    notify.info("Queue cleared", "Image queue and conversion results have been cleared.");
  });

  const updateOutputFormat = useEffectEvent((value: "jpg" | "png") => {
    startTransition(() => {
      setState((current) => ({
        ...current,
        outputFormat: value,
      }));
    });
  });

  const updateQualityInput = useEffectEvent((value: string) => {
    startTransition(() => {
      setState((current) => ({
        ...current,
        qualityInput: value,
      }));
    });
  });

  const normalizeQualityInput = useEffectEvent(() => {
    startTransition(() => {
      setState((current) => ({
        ...current,
        qualityInput: clampQualityInput(current.qualityInput),
      }));
    });
  });

  const updateResizeEnabled = useEffectEvent((checked: boolean) => {
    startTransition(() => {
      setState((current) => ({
        ...current,
        resizeEnabled: checked,
      }));
    });
  });

  const updateResizeWidth = useEffectEvent((value: string) => {
    startTransition(() => {
      setState((current) => ({
        ...current,
        resizeWidth: value,
      }));
    });
  });

  const updateResizeHeight = useEffectEvent((value: string) => {
    startTransition(() => {
      setState((current) => ({
        ...current,
        resizeHeight: value,
      }));
    });
  });

  const updateCompress = useEffectEvent((checked: boolean) => {
    startTransition(() => {
      setState((current) => ({
        ...current,
        compress: checked,
      }));
    });
  });

  const copyOutputPath = useEffectEvent(async (path?: string) => {
    if (!path) {
      notify.error("Output path not available", "This file does not have an output path to copy yet.");
      return;
    }

    try {
      await copyText(path);
      notify.success("Output path copied", "The result file location was copied to the clipboard.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Clipboard is not available.";
      notify.error("Copy failed", message);
    }
  });

  const runConversion = useEffectEvent(async () => {
    if (!isDesktopRuntime) {
      notify.error("Open the desktop app", "Image conversion is available when Orion is opened as a desktop app.");
      return;
    }

    const snapshot = {
      ...state,
      outputFolderPath: state.outputFolderPath?.trim() || defaultOutputFolder?.trim() || undefined,
      response: undefined,
    };
    const validation = validateImageConversion(snapshot);

    if (!validation.valid) {
      notify.error("Configuration is not valid", validation.message);
      startTransition(() => {
        setState((current) => ({
          ...current,
          status: "error",
          errorMessage: validation.message,
        }));
      });
      return;
    }

    const request: ConvertImagesOptionsRequest = {
      inputPaths: state.files.map((file) => file.path),
      outputFolderPath: state.outputFolderPath?.trim() || defaultOutputFolder?.trim() || "",
      outputFormat: state.outputFormat,
      quality: state.outputFormat === "jpg" ? Number(clampQualityInput(state.qualityInput)) : undefined,
      resize: buildResizeOptions(state),
      compress: state.compress,
    };

    startTransition(() => {
      setState((current) => ({
        ...current,
        status: "loading",
        progressPercent: 0,
        progressStatus: "Starting conversion",
        currentFileName: undefined,
        response: undefined,
        errorMessage: undefined,
      }));
    });

    try {
      const response = await convertImages(request);
      const toastSummary = summarizeConversionToast(response.successCount, response.failedCount, response.totalFiles);

      startTransition(() => {
        setState((current) => ({
          ...current,
          status: response.failedCount > 0 ? "error" : "ready",
          progressPercent: 100,
          progressStatus:
            response.failedCount > 0
              ? `Finished with ${response.failedCount} failed files`
              : "Conversion finished",
          response,
          errorMessage:
            response.failedCount > 0
              ? `${response.failedCount} files could not be processed. Check the result list below for details.`
              : undefined,
        }));
      });

      const pushToast = toastSummary.tone === "success"
        ? notify.success
        : toastSummary.tone === "error"
          ? notify.error
          : notify.info;

      pushToast(toastSummary.title, toastSummary.description);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Image conversion could not be processed.";
      startTransition(() => {
        setState((current) => ({
          ...current,
          status: "error",
          progressStatus: "Conversion failed",
          errorMessage: message,
        }));
      });
      notify.error("Conversion failed", message);
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

    void window.listen<ImageConversionProgressResponse>(IMAGE_CONVERSION_PROGRESS_EVENT, ({ payload }) => {
      startTransition(() => {
        setState((current) => ({
          ...current,
          progressPercent: payload.progressPercent,
          progressStatus: payload.status,
          currentFileName: payload.currentFileName || current.currentFileName,
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
    outputFolderPath: state.outputFolderPath?.trim() || defaultOutputFolder?.trim() || undefined,
    outputFolderSource: state.outputFolderPath?.trim() ? "custom" : defaultOutputFolder?.trim() ? "default" : "unset",
    outputModeDescription: describeOutputMode(state.outputFormat, state.compress),
    pickImages: () => void pickImages(),
    pickOutputFolder: () => void pickOutputFolder(),
    removeFile: (path: string) => removeFile(path),
    clearQueue: () => clearQueue(),
    updateOutputFormat: (value: "jpg" | "png") => updateOutputFormat(value),
    updateQualityInput: (value: string) => updateQualityInput(value),
    normalizeQualityInput: () => normalizeQualityInput(),
    updateResizeEnabled: (checked: boolean) => updateResizeEnabled(checked),
    updateResizeWidth: (value: string) => updateResizeWidth(value),
    updateResizeHeight: (value: string) => updateResizeHeight(value),
    updateCompress: (checked: boolean) => updateCompress(checked),
    copyOutputPath: (path?: string) => void copyOutputPath(path),
    runConversion: () => void runConversion(),
  };
}
