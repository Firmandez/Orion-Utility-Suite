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
    progressStatus: "Waiting for file selection",
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
      source === "drop" ? "File dropped" : "File selected",
      `${getBaseName(filePath)} siap diproses oleh hash engine Rust.`,
    );
  });

  const pickFile = useEffectEvent(async () => {
    if (!isDesktopRuntime) {
      notify.error("Desktop runtime required", "File picker native hanya tersedia saat Orion berjalan lewat Tauri desktop.");
      return;
    }

    const selection = await open({
      title: "Select a file for hash generation",
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
        progressStatus: "Waiting for file selection",
        errorMessage: undefined,
      }));
    });
    notify.info("Selection cleared", "File target dan hasil digest dibersihkan.");
  });

  const setReferenceHash = useEffectEvent((value: string) => {
    startTransition(() => {
      setState((current) => ({ ...current, referenceHash: value }));
    });
  });

  const runHash = useEffectEvent(async () => {
    if (!state.selectedFilePath) {
      notify.error("No file selected", "Pilih atau drop file lebih dulu sebelum menjalankan hash checker.");
      return;
    }

    if (!isDesktopRuntime) {
      notify.error("Desktop runtime required", "Hash streaming Rust hanya tersedia saat Orion berjalan lewat Tauri desktop.");
      return;
    }

    activeFilePathRef.current = state.selectedFilePath;
    startTransition(() => {
      setState((current) => ({
        ...current,
        status: "loading",
        result: undefined,
        progressPercent: 0,
        progressStatus: "Preparing hash worker",
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
          progressStatus: "Hash generation completed",
          errorMessage: undefined,
        }));
      });
      notify.success("Hashes generated", `${result.fileName} selesai diproses dengan MD5, SHA1, dan SHA256.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Hash generation gagal diproses.";
      startTransition(() => {
        setState((current) => ({
          ...current,
          status: "error",
          progressStatus: "Hash generation failed",
          errorMessage: message,
        }));
      });
      notify.error("Hash generation failed", message);
    }
  });

  const copyHashValue = useEffectEvent(async (label: string, value?: string) => {
    if (!value) {
      notify.error("Hash not available", "Jalankan hashing file lebih dulu sebelum menyalin digest.");
      return;
    }

    try {
      await copyText(value);
      notify.success(`${label} copied`, "Digest berhasil disalin ke clipboard.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Clipboard tidak tersedia.";
      notify.error("Copy failed", message);
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

        const nextFilePath = event.payload.paths[0];

        if (nextFilePath) {
          applySelectedFile(nextFilePath, "drop");
        }
      }
    }).then((unlisten) => {
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
    pickFile: () => void pickFile(),
    clearSelection: () => clearSelection(),
    setReferenceHash: (value: string) => setReferenceHash(value),
    runHash: () => void runHash(),
    copyHashValue: (label: string, value?: string) => void copyHashValue(label, value),
  };
}
