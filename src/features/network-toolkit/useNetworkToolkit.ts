import { startTransition, useEffect, useEffectEvent, useState } from "react";
import { notify } from "@/components/ui/Toast";
import { copyText } from "@/lib/clipboard";
import { checkHttpStatus, checkPort, dnsLookup, getLocalIp, pingHost } from "@/lib/tauri";
import type { AppBootstrapState } from "@/types/app";
import type { NetworkToolkitState } from "./network-toolkit.types";
import { parsePortInput } from "./network-toolkit.utils";

export function useNetworkToolkit(bootstrap: AppBootstrapState) {
  const isDesktopRuntime = bootstrap.source === "rust";
  const [state, setState] = useState<NetworkToolkitState>({
    localIp: { status: "idle" },
    dnsDomain: "example.com",
    dns: { status: "idle" },
    pingHost: "example.com",
    ping: { status: "idle" },
    portHost: "example.com",
    portValue: "443",
    port: { status: "idle" },
    httpUrl: "https://example.com",
    http: { status: "idle" },
  });

  const copyDiagnostic = useEffectEvent(async (label: string, content: string) => {
    if (!content.trim()) {
      notify.error("Tidak ada hasil", `Belum ada hasil ${label} yang bisa disalin.`);
      return;
    }

    try {
      await copyText(content);
      notify.success("Result copied", `Hasil ${label} berhasil disalin ke clipboard.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Clipboard tidak tersedia.";
      notify.error("Copy failed", message);
    }
  });

  async function loadLocalIp() {
    if (!isDesktopRuntime) {
      return;
    }

    startTransition(() => {
      setState((current) => ({
        ...current,
        localIp: { status: "loading" },
      }));
    });

    try {
      const result = await getLocalIp();
      startTransition(() => {
        setState((current) => ({
          ...current,
          localIp: { status: "ready", data: result },
        }));
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Gagal mengambil local IP.";
      startTransition(() => {
        setState((current) => ({
          ...current,
          localIp: { status: "error", errorMessage: message },
        }));
      });
      notify.error("Local IP failed", message);
    }
  }

  const runDnsLookup = useEffectEvent(async () => {
    const domain = state.dnsDomain.trim();

    if (!domain) {
      notify.error("Domain required", "Masukkan domain atau host untuk DNS lookup.");
      return;
    }

    if (!isDesktopRuntime) {
      notify.error("Buka aplikasi desktop", "DNS lookup tersedia saat Orion dibuka sebagai aplikasi desktop.");
      return;
    }

    startTransition(() => {
      setState((current) => ({
        ...current,
        dns: { status: "loading" },
      }));
    });

    try {
      const result = await dnsLookup(domain);
      startTransition(() => {
        setState((current) => ({
          ...current,
          dns: { status: "ready", data: result },
        }));
      });
      notify.success("DNS lookup completed", `${result.addresses.length} alamat ditemukan untuk ${result.domain}.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "DNS lookup gagal diproses.";
      startTransition(() => {
        setState((current) => ({
          ...current,
          dns: { status: "error", errorMessage: message },
        }));
      });
      notify.error("DNS lookup failed", message);
    }
  });

  const runPingHost = useEffectEvent(async () => {
    const host = state.pingHost.trim();

    if (!host) {
      notify.error("Host required", "Masukkan host atau IP untuk ping.");
      return;
    }

    if (!isDesktopRuntime) {
      notify.error("Buka aplikasi desktop", "Ping host tersedia saat Orion dibuka sebagai aplikasi desktop.");
      return;
    }

    startTransition(() => {
      setState((current) => ({
        ...current,
        ping: { status: "loading" },
      }));
    });

    try {
      const result = await pingHost(host);
      startTransition(() => {
        setState((current) => ({
          ...current,
          ping: { status: "ready", data: result },
        }));
      });
      notify.success("Ping completed", result.summary);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Ping gagal diproses.";
      startTransition(() => {
        setState((current) => ({
          ...current,
          ping: { status: "error", errorMessage: message },
        }));
      });
      notify.error("Ping failed", message);
    }
  });

  const runPortCheck = useEffectEvent(async () => {
    const host = state.portHost.trim();
    const parsedPort = parsePortInput(state.portValue);

    if (!host) {
      notify.error("Host required", "Masukkan host untuk port checker.");
      return;
    }

    if (!parsedPort) {
      notify.error("Port invalid", "Port harus berupa angka 1 sampai 65535.");
      return;
    }

    if (!isDesktopRuntime) {
      notify.error("Buka aplikasi desktop", "Port checker tersedia saat Orion dibuka sebagai aplikasi desktop.");
      return;
    }

    startTransition(() => {
      setState((current) => ({
        ...current,
        port: { status: "loading" },
      }));
    });

    try {
      const result = await checkPort(host, parsedPort);
      startTransition(() => {
        setState((current) => ({
          ...current,
          port: { status: "ready", data: result },
        }));
      });
      notify.success("Port check completed", result.summary);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Port checker gagal diproses.";
      startTransition(() => {
        setState((current) => ({
          ...current,
          port: { status: "error", errorMessage: message },
        }));
      });
      notify.error("Port check failed", message);
    }
  });

  const runHttpStatusCheck = useEffectEvent(async () => {
    const url = state.httpUrl.trim();

    if (!url) {
      notify.error("URL required", "Masukkan URL untuk HTTP status checker.");
      return;
    }

    if (!isDesktopRuntime) {
      notify.error("Buka aplikasi desktop", "HTTP checker tersedia saat Orion dibuka sebagai aplikasi desktop.");
      return;
    }

    startTransition(() => {
      setState((current) => ({
        ...current,
        http: { status: "loading" },
      }));
    });

    try {
      const result = await checkHttpStatus(url);
      startTransition(() => {
        setState((current) => ({
          ...current,
          http: { status: "ready", data: result },
        }));
      });
      notify.success("HTTP status completed", result.summary);
    } catch (error) {
      const message = error instanceof Error ? error.message : "HTTP status checker gagal diproses.";
      startTransition(() => {
        setState((current) => ({
          ...current,
          http: { status: "error", errorMessage: message },
        }));
      });
      notify.error("HTTP status failed", message);
    }
  });

  useEffect(() => {
    if (!isDesktopRuntime) {
      return;
    }

    void loadLocalIp();
  }, [isDesktopRuntime]);

  return {
    ...state,
    isDesktopRuntime,
    setDnsDomain: (value: string) =>
      setState((current) => ({
        ...current,
        dnsDomain: value,
      })),
    setPingHost: (value: string) =>
      setState((current) => ({
        ...current,
        pingHost: value,
      })),
    setPortHost: (value: string) =>
      setState((current) => ({
        ...current,
        portHost: value,
      })),
    setPortValue: (value: string) =>
      setState((current) => ({
        ...current,
        portValue: value,
      })),
    setHttpUrl: (value: string) =>
      setState((current) => ({
        ...current,
        httpUrl: value,
      })),
    copyDiagnostic: (label: string, content: string) => void copyDiagnostic(label, content),
    loadLocalIp: () => void loadLocalIp(),
    runDnsLookup: () => void runDnsLookup(),
    runPingHost: () => void runPingHost(),
    runPortCheck: () => void runPortCheck(),
    runHttpStatusCheck: () => void runHttpStatusCheck(),
  };
}
