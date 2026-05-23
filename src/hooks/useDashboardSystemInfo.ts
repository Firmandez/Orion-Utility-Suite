import { startTransition, useEffect, useState } from "react";
import { getLocalIp, getSystemInfo } from "@/lib/tauri";
import type {
  AppBootstrapState,
  DashboardSystemState,
  LocalIpResponse,
  SystemInfoResponse,
} from "@/types/app";

function buildPreviewSystemInfo(bootstrap: AppBootstrapState): SystemInfoResponse {
  return {
    os: bootstrap.data.platformLabel,
    architecture: "Available in desktop app",
    appVersion: bootstrap.data.version,
  };
}

function normalizeError(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Unable to read the requested system data.";
}

export function useDashboardSystemInfo(bootstrap: AppBootstrapState) {
  const [state, setState] = useState<DashboardSystemState>({ status: "loading" });

  async function loadSystemInfo() {
    startTransition(() => {
      setState((current) => ({
        ...current,
        status: "loading",
        errorMessage: undefined,
      }));
    });

    if (bootstrap.status !== "ready") {
      return;
    }

    if (bootstrap.source === "mock") {
      startTransition(() => {
        setState({
          status: "error",
          systemInfo: buildPreviewSystemInfo(bootstrap),
          errorMessage: "Informasi perangkat lengkap tersedia saat Orion dibuka sebagai aplikasi desktop.",
        });
      });
      return;
    }

    const [systemInfoResult, localIpResult] = await Promise.allSettled([
      getSystemInfo(),
      getLocalIp(),
    ]);

    const errors: string[] = [];
    let systemInfo: SystemInfoResponse | undefined;
    let localIp: LocalIpResponse | undefined;

    if (systemInfoResult.status === "fulfilled") {
      systemInfo = systemInfoResult.value;
    } else {
      errors.push(`System info: ${normalizeError(systemInfoResult.reason)}`);
      systemInfo = buildPreviewSystemInfo(bootstrap);
    }

    if (localIpResult.status === "fulfilled") {
      localIp = localIpResult.value;
    } else {
      errors.push(`Local IP: ${normalizeError(localIpResult.reason)}`);
    }

    startTransition(() => {
      setState({
        status: errors.length > 0 ? "error" : "ready",
        systemInfo,
        localIp,
        errorMessage: errors.length > 0 ? errors.join(" ") : undefined,
      });
    });
  }

  useEffect(() => {
    if (bootstrap.status !== "ready") {
      return;
    }

    void loadSystemInfo();
  }, [bootstrap.status, bootstrap.source, bootstrap.data.platformLabel, bootstrap.data.version]);

  return {
    ...state,
    reload: () => {
      void loadSystemInfo();
    },
  };
}
