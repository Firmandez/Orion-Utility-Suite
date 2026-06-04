import { getCurrentWindow } from "@tauri-apps/api/window";
import { open } from "@tauri-apps/plugin-dialog";
import { startTransition, useEffect, useEffectEvent, useRef, useState } from "react";
import { notify } from "@/components/ui/Toast";
import {
  checkYtdlpAvailable,
  fetchYtdlpInfo,
  startYtdlpDownload,
  cancelYtdlpDownload,
  updateYtdlp,
  openExternalUrl,
} from "@/lib/tauri";
import type {
  AppBootstrapState,
  YtdlpAvailability,
  YtdlpVideoInfo,
  YtdlpProgressPayload,
  YtdlpStatus,
} from "@/types/app";
import type { DownloadType, VideoQuality, VideoContainer, AudioContainer } from "./youtube-downloader.types";
import { YTDLP_PROGRESS_EVENT, DEFAULT_FILENAME_TEMPLATE } from "./youtube-downloader.types";
import { isValidUrl } from "./youtube-downloader.utils";

interface YoutubeDownloaderState {
  url: string;
  availability: YtdlpAvailability | null;
  videoInfo: YtdlpVideoInfo | null;
  status: YtdlpStatus;
  downloadType: DownloadType;
  videoQuality: VideoQuality;
  videoFormat: VideoContainer;
  audioFormat: AudioContainer;
  outputFolder: string;
  filenameTemplate: string;
  progressPercent: number;
  progressSpeed: string | null;
  progressEta: string | null;
  progressDownloaded: string | null;
  progressTotal: string | null;
  progressMessage: string;
  logLines: string[];
  downloadId: string | null;
  outputPath: string | null;
  errorMessage: string | null;
  isUpdating: boolean;
}

const MAX_LOG_LINES = 200;

export function useYoutubeDownloader(bootstrap: AppBootstrapState) {
  const isDesktopRuntime = bootstrap.source === "rust";
  const activeDownloadIdRef = useRef<string | null>(null);

  const [state, setState] = useState<YoutubeDownloaderState>({
    url: "",
    availability: null,
    videoInfo: null,
    status: "idle",
    downloadType: "video",
    videoQuality: "best",
    videoFormat: "mp4",
    audioFormat: "mp3",
    outputFolder: "",
    filenameTemplate: DEFAULT_FILENAME_TEMPLATE,
    progressPercent: 0,
    progressSpeed: null,
    progressEta: null,
    progressDownloaded: null,
    progressTotal: null,
    progressMessage: "Waiting",
    logLines: [],
    downloadId: null,
    outputPath: null,
    errorMessage: null,
    isUpdating: false,
  });

  const checkAvailability = useEffectEvent(async () => {
    if (!isDesktopRuntime) return;

    startTransition(() => {
      setState((c) => ({ ...c, status: "checking", errorMessage: null }));
    });

    try {
      const result = await checkYtdlpAvailable();
      startTransition(() => {
        setState((c) => ({
          ...c,
          availability: result,
          status: "idle",
          errorMessage: result.ytdlpAvailable
            ? null
            : "yt-dlp was not found. Please install yt-dlp or place the executable in your system PATH.",
        }));
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to check yt-dlp availability.";
      startTransition(() => {
        setState((c) => ({
          ...c,
          status: "idle",
          errorMessage: message,
        }));
      });
    }
  });

  const setUrl = useEffectEvent((value: string) => {
    startTransition(() => {
      setState((c) => ({ ...c, url: value }));
    });
  });

  const setDownloadType = useEffectEvent((value: DownloadType) => {
    startTransition(() => {
      setState((c) => ({ ...c, downloadType: value }));
    });
  });

  const setVideoQuality = useEffectEvent((value: VideoQuality) => {
    startTransition(() => {
      setState((c) => ({ ...c, videoQuality: value }));
    });
  });

  const setVideoFormat = useEffectEvent((value: VideoContainer) => {
    startTransition(() => {
      setState((c) => ({ ...c, videoFormat: value }));
    });
  });

  const setAudioFormat = useEffectEvent((value: AudioContainer) => {
    startTransition(() => {
      setState((c) => ({ ...c, audioFormat: value }));
    });
  });

  const setFilenameTemplate = useEffectEvent((value: string) => {
    startTransition(() => {
      setState((c) => ({ ...c, filenameTemplate: value }));
    });
  });

  const analyzeUrl = useEffectEvent(async () => {
    if (!isDesktopRuntime) {
      notify.error("Desktop only", "YouTube Downloader requires the desktop app.");
      return;
    }
    if (!isValidUrl(state.url)) {
      notify.error("Invalid URL", "Please enter a valid HTTP or HTTPS URL.");
      return;
    }

    startTransition(() => {
      setState((c) => ({
        ...c,
        status: "analyzing",
        videoInfo: null,
        errorMessage: null,
        logLines: [],
        progressPercent: 0,
        outputPath: null,
      }));
    });

    try {
      const info = await fetchYtdlpInfo(state.url);
      startTransition(() => {
        setState((c) => ({
          ...c,
          videoInfo: info,
          status: "ready",
          errorMessage: null,
        }));
      });
      notify.success("URL analyzed", `Found: ${info.title}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to analyze URL.";
      startTransition(() => {
        setState((c) => ({
          ...c,
          status: "idle",
          errorMessage: message,
        }));
      });
      notify.error("Analysis failed", message);
    }
  });

  const pickOutputFolder = useEffectEvent(async () => {
    if (!isDesktopRuntime) return;

    const selected = await open({
      title: "Choose output folder",
      directory: true,
      multiple: false,
    });

    if (typeof selected === "string") {
      startTransition(() => {
        setState((c) => ({ ...c, outputFolder: selected }));
      });
      notify.success("Folder selected", selected);
    }
  });

  const startDownload = useEffectEvent(async () => {
    if (!isDesktopRuntime) {
      notify.error("Desktop only", "YouTube Downloader requires the desktop app.");
      return;
    }
    if (!isValidUrl(state.url)) {
      notify.error("Invalid URL", "Please enter a valid URL before downloading.");
      return;
    }
    if (!state.outputFolder) {
      notify.error("No output folder", "Please select an output folder before downloading.");
      return;
    }

    const downloadId = crypto.randomUUID();
    activeDownloadIdRef.current = downloadId;

    startTransition(() => {
      setState((c) => ({
        ...c,
        status: "downloading",
        downloadId,
        progressPercent: 0,
        progressSpeed: null,
        progressEta: null,
        progressDownloaded: null,
        progressTotal: null,
        progressMessage: "Starting download...",
        logLines: [],
        errorMessage: null,
        outputPath: null,
      }));
    });

    try {
      const result = await startYtdlpDownload({
        url: state.url,
        downloadType: state.downloadType,
        videoQuality: state.downloadType === "video" ? state.videoQuality : null,
        videoFormat: state.downloadType === "video" ? state.videoFormat : null,
        audioFormat: state.downloadType === "audio" ? state.audioFormat : null,
        outputFolder: state.outputFolder,
        filenameTemplate: state.filenameTemplate || DEFAULT_FILENAME_TEMPLATE,
        downloadId,
      });

      activeDownloadIdRef.current = null;

      if (result.status === "completed") {
        startTransition(() => {
          setState((c) => ({
            ...c,
            status: "completed",
            progressPercent: 100,
            progressMessage: "Download completed.",
            outputPath: result.outputPath,
          }));
        });
        notify.success("Download completed", result.message);
      } else if (result.status === "cancelled") {
        startTransition(() => {
          setState((c) => ({
            ...c,
            status: "cancelled",
            progressMessage: "Download cancelled.",
          }));
        });
        notify.info("Download cancelled", "The download was cancelled.");
      } else {
        startTransition(() => {
          setState((c) => ({
            ...c,
            status: "failed",
            errorMessage: result.message,
            progressMessage: "Download failed.",
          }));
        });
        notify.error("Download failed", result.message);
      }
    } catch (error) {
      activeDownloadIdRef.current = null;
      const message = error instanceof Error ? error.message : "Download failed.";
      startTransition(() => {
        setState((c) => ({
          ...c,
          status: "failed",
          errorMessage: message,
          progressMessage: "Download failed.",
        }));
      });
      notify.error("Download failed", message);
    }
  });

  const cancelDownload = useEffectEvent(async () => {
    if (!state.downloadId) return;

    try {
      await cancelYtdlpDownload(state.downloadId);
    } catch {
      // Process may already be dead
    }
  });

  const openOutputFolder = useEffectEvent(async () => {
    if (state.outputPath) {
      try {
        await openExternalUrl(state.outputPath);
      } catch {
        notify.error("Failed to open folder", "Could not open the output folder.");
      }
    }
  });

  const resetState = useEffectEvent(() => {
    activeDownloadIdRef.current = null;
    startTransition(() => {
      setState((c) => ({
        ...c,
        videoInfo: null,
        status: c.availability?.ytdlpAvailable ? "idle" : c.status,
        progressPercent: 0,
        progressSpeed: null,
        progressEta: null,
        progressDownloaded: null,
        progressTotal: null,
        progressMessage: "Waiting",
        logLines: [],
        downloadId: null,
        outputPath: null,
        errorMessage: null,
      }));
    });
  });

  const handleUpdateYtdlp = useEffectEvent(async () => {
    if (!isDesktopRuntime) return;

    startTransition(() => {
      setState((c) => ({ ...c, isUpdating: true, errorMessage: null }));
    });

    try {
      const result = await updateYtdlp();
      if (result.success) {
        notify.success("yt-dlp update", result.message);
        // Refresh availability to show the new version
        await checkAvailability();
      } else {
        notify.error("yt-dlp update failed", result.message);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update yt-dlp.";
      notify.error("Update failed", message);
    } finally {
      startTransition(() => {
        setState((c) => ({ ...c, isUpdating: false }));
      });
    }
  });

  // Set up event listeners
  useEffect(() => {
    if (!isDesktopRuntime) return;

    void checkAvailability();

    const tauriWindow = getCurrentWindow();
    let disposed = false;
    let unlistenProgress: (() => void) | undefined;

    void tauriWindow.listen<YtdlpProgressPayload>(YTDLP_PROGRESS_EVENT, ({ payload }) => {
      if (!activeDownloadIdRef.current || payload.downloadId !== activeDownloadIdRef.current) return;

      startTransition(() => {
        setState((c) => {
          const nextLogLines = payload.message && payload.message.trim()
            ? [...c.logLines, payload.message].slice(-MAX_LOG_LINES)
            : c.logLines;

          return {
            ...c,
            progressPercent: payload.progressPercent >= 0 ? payload.progressPercent : c.progressPercent,
            progressSpeed: payload.speed ?? c.progressSpeed,
            progressEta: payload.eta ?? c.progressEta,
            progressDownloaded: payload.downloadedSize ?? c.progressDownloaded,
            progressTotal: payload.totalSize ?? c.progressTotal,
            progressMessage: payload.message || c.progressMessage,
            logLines: nextLogLines,
          };
        });
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
      unlistenProgress?.();
    };
  }, [isDesktopRuntime]);

  return {
    ...state,
    isDesktopRuntime,
    setUrl: (value: string) => setUrl(value),
    setDownloadType: (value: DownloadType) => setDownloadType(value),
    setVideoQuality: (value: VideoQuality) => setVideoQuality(value),
    setVideoFormat: (value: VideoContainer) => setVideoFormat(value),
    setAudioFormat: (value: AudioContainer) => setAudioFormat(value),
    setFilenameTemplate: (value: string) => setFilenameTemplate(value),
    analyzeUrl: () => void analyzeUrl(),
    pickOutputFolder: () => void pickOutputFolder(),
    startDownload: () => void startDownload(),
    cancelDownload: () => void cancelDownload(),
    openOutputFolder: () => void openOutputFolder(),
    resetState: () => resetState(),
    updateYtdlp: () => void handleUpdateYtdlp(),
  };
}
