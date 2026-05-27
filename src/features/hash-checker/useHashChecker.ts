import { getCurrentWindow } from "@tauri-apps/api/window";
import { open } from "@tauri-apps/plugin-dialog";
import { startTransition, useEffect, useEffectEvent, useRef, useState } from "react";
import { notify } from "@/components/ui/Toast";
import { copyText } from "@/lib/clipboard";
import { generateHash } from "@/lib/tauri";
import type { AppBootstrapState, HashProgressResponse, HashResultResponse } from "@/types/app";
import type { HashCheckerStatus } from "./hash-checker.types";
import { getBaseName, HASH_PROGRESS_EVENT } from "./hash-checker.utils";

interface HashCheckerState {
  selectedFilePath?: string;
  selectedFileName?: string;
  referenceHash: string;
  result?: HashResultResponse;
  status: HashCheckerStatus;
  progressPercent: number;
  progressStatus: string;
  isWindowDragActive: boolean;
  errorMessage?: string;
}

export function useHashChecker(bootstrap: AppBootstrapState) {
  const isDesktopRuntime = bootstrap.source === "rust";
  const activeFilePathRef = useRef<string | undefined>(undefined);
  const [state, setState] = useState<HashCheckerState>({
    referenceHash: "",
    status: "idle",
    progressPercent: 0,
    progressStatus: "Waiting for file",
    isWindowDragActive: false,
  });

  const applySelectedFile = useEffectEvent((filePath: string, source: "picker" | "drop") => {
    startTransition(() => {
      setState((current) => ({
        ...current,
        selectedFilePath: filePath,
        selectedFileName: getBaseName(filePath),
        result: undefined,
        status: "idle",
        progressPercent: 0,
        progressStatus: "Ready to generate hashes",
        errorMessage: undefined,
      }));
    });

    notify.success(
      source === "drop" ? "Dropped file selected" : "File selected",
      `${getBaseName(filePath)} is ready to check.`,
    );
  });

  const pickFile = useEffectEvent(async () => {
    if (!isDesktopRuntime) {
      notify.error("Open the desktop app", "File selection is available when Orion is opened as a desktop app.");
      return;
    }

    const selection = await open({
      title: "Choose file for hashing",
      multiple: false,
      directory: false,
    });

    if (typeof selection === "string") {
      applySelectedFile(selection, "picker");
    }
  });

  const clearSelection = useEffectEvent(() => {
    activeFilePathRef.current = undefined;
    startTransition(() => {
      setState((current) => ({
        ...current,
        selectedFilePath: undefined,
        selectedFileName: undefined,
        result: undefined,
        status: "idle",
        progressPercent: 0,
        progressStatus: "Waiting for file",
        errorMessage: undefined,
      }));
    });
    notify.info("Selection cleared", "Target file and digest results have been cleared.");
  });

  const setReferenceHash = useEffectEvent((value: string) => {
    startTransition(() => {
      setState((current) => ({ ...current, referenceHash: value }));
    });
  });

  const runHash = useEffectEvent(async () => {
    if (!state.selectedFilePath) {
      notify.error("No file selected", "Choose or drop a file before running the hash checker.");
      return;
    }

    if (!isDesktopRuntime) {
      notify.error("Open the desktop app", "Hash Checker is available when Orion is opened as a desktop app.");
      return;
    }

    activeFilePathRef.current = state.selectedFilePath;
    startTransition(() => {
      setState((current) => ({
        ...current,
        status: "loading",
        result: undefined,
        progressPercent: 0,
        progressStatus: "Preparing hashes",
        errorMessage: undefined,
      }));
    });

    try {
      const result = await generateHash(state.selectedFilePath);
      startTransition(() => {
        setState((current) => ({
          ...current,
          result,
          status: "ready",
          progressPercent: 100,
          progressStatus: "Hashing finished",
          errorMessage: undefined,
        }));
      });
      notify.success("Hashes generated", `${result.fileName} was processed with MD5, SHA1, and SHA256.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Hash generation could not be processed.";
      startTransition(() => {
        setState((current) => ({
          ...current,
          status: "error",
          progressStatus: "Hashing failed",
          errorMessage: message,
        }));
      });
      notify.error("Hashing failed", message);
    }
  });

  const copyHashValue = useEffectEvent(async (label: string, value?: string) => {
    if (!value) {
      notify.error("Hash not available", "Run file hashing before copying a digest.");
      return;
    }

    try {
      await copyText(value);
      notify.success(`${label} copied`, "Digest copied to the clipboard.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Clipboard is not available.";
      notify.error("Copy failed", message);
    }
  });

  useEffect(() => {
    if (!isDesktopRuntime) {
      return;
    }

    const window = getCurrentWindow();
    let disposed = false;
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

        const nextFilePath = event.payload.paths[0];

        if (nextFilePath) {
          applySelectedFile(nextFilePath, "drop");
        }
      }
    }).then((unlisten) => {
      if (disposed) {
        unlisten();
        return;
      }

      unlistenDragDrop = unlisten;
    });

    void window.listen<HashProgressResponse>(HASH_PROGRESS_EVENT, ({ payload }) => {
      if (!activeFilePathRef.current || payload.filePath !== activeFilePathRef.current) {
        return;
      }

      startTransition(() => {
        setState((current) => ({
          ...current,
          progressPercent: payload.progressPercent,
          progressStatus: payload.status,
        }));
      });
    }).then((unlisten) => {
      if (disposed) {
        unlisten();
        return;
      }

      unlistenProgress = unlisten;
    });

    return () => {
      disposed = true;
      unlistenDragDrop?.();
      unlistenProgress?.();
    };
  }, [isDesktopRuntime]);

  return {
    ...state,
    isDesktopRuntime,
    pickFile: () => void pickFile(),
    clearSelection: () => clearSelection(),
    setReferenceHash: (value: string) => setReferenceHash(value),
    runHash: () => void runHash(),
    copyHashValue: (label: string, value?: string) => void copyHashValue(label, value),
  };
}
