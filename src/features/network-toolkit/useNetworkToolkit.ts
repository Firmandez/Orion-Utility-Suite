import { startTransition, useEffect, useEffectEvent, useState } from "react";
import { notify } from "@/components/ui/Toast";
import { copyText } from "@/lib/clipboard";
import {
  checkHttpStatus,
  checkPort,
  dnsLookup,
  getLocalIp,
  pingHost,
  scanSubnet,
  getWifiNetworks,
  getActiveWifiInterface,
} from "@/lib/tauri";
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
    subnet: { status: "idle" },
    wifiNetworks: { status: "idle" },
    activeWifi: { status: "idle" },
  });

  const copyDiagnostic = useEffectEvent(async (label: string, content: string) => {
    if (!content.trim()) {
      notify.error("No result", `No ${label} result is available to copy yet.`);
      return;
    }

    try {
      await copyText(content);
      notify.success("Result copied", `${label} result copied to the clipboard.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Clipboard is not available.";
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
      const message = error instanceof Error ? error.message : "Failed to fetch local IP.";
      startTransition(() => {
        setState((current) => ({
          ...current,
          localIp: { status: "error", errorMessage: message },
        }));
      });
      notify.error("Failed to fetch local IP", message);
    }
  }

  const runDnsLookup = useEffectEvent(async () => {
    const domain = state.dnsDomain.trim();

    if (!domain) {
      notify.error("Domain is required", "Enter a domain or host for DNS lookup.");
      return;
    }

    if (!isDesktopRuntime) {
      notify.error("Open the desktop app", "DNS lookup is available when Orion is opened as a desktop app.");
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
      notify.success("DNS lookup finished", `${result.addresses.length} addresses found for ${result.domain}.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "DNS lookup could not be processed.";
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
      notify.error("Host is required", "Enter a host or IP for ping.");
      return;
    }

    if (!isDesktopRuntime) {
      notify.error("Open the desktop app", "Ping is available when Orion is opened as a desktop app.");
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
      notify.success("Ping finished", result.summary);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Ping could not be processed.";
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
      notify.error("Host is required", "Enter a host for the port checker.");
      return;
    }

    if (!parsedPort) {
      notify.error("Invalid port", "Port must be a number from 1 to 65535.");
      return;
    }

    if (!isDesktopRuntime) {
      notify.error("Open the desktop app", "Port Checker is available when Orion is opened as a desktop app.");
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
      notify.success("Port check finished", result.summary);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Port Checker could not be processed.";
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
      notify.error("URL is required", "Enter a URL for the HTTP status checker.");
      return;
    }

    if (!isDesktopRuntime) {
      notify.error("Open the desktop app", "HTTP Checker is available when Orion is opened as a desktop app.");
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
      notify.success("HTTP status finished", result.summary);
    } catch (error) {
      const message = error instanceof Error ? error.message : "HTTP status checker could not be processed.";
      startTransition(() => {
        setState((current) => ({
          ...current,
          http: { status: "error", errorMessage: message },
        }));
      });
      notify.error("HTTP status failed", message);
    }
  });

  const runSubnetScan = useEffectEvent(async () => {
    if (!isDesktopRuntime) {
      startTransition(() => {
        setState((current) => ({
          ...current,
          subnet: { status: "loading" },
        }));
      });
      await new Promise((resolve) => setTimeout(resolve, 1200));
      const mockSubnet = {
        subnet: "192.168.1.0/24",
        localIp: "192.168.1.10",
        devices: [
          { ip: "192.168.1.1", mac: "04:18:B6:33:44:55", deviceType: "Gateway", vendor: "Ubiquiti", hostname: "router.local", isAlive: true },
          { ip: "192.168.1.10", mac: "Local Loopback", deviceType: "Local PC", vendor: "Self", hostname: "localhost", isAlive: true },
          { ip: "192.168.1.15", mac: "04:D4:C4:AA:BB:CC", deviceType: "Dynamic", vendor: "Samsung", hostname: "galaxy-s24.local", isAlive: true },
          { ip: "192.168.1.100", mac: "80:7A:BF:99:88:77", deviceType: "Dynamic", vendor: "Raspberry Pi", hostname: "pi-hole.local", isAlive: true },
        ]
      };
      startTransition(() => {
        setState((current) => ({
          ...current,
          subnet: { status: "ready", data: mockSubnet },
        }));
      });
      notify.success("Subnet scan completed", "Discovered 4 active devices in simulated browser environment.");
      return;
    }

    startTransition(() => {
      setState((current) => ({
        ...current,
        subnet: { status: "loading" },
      }));
    });

    try {
      const result = await scanSubnet();
      startTransition(() => {
        setState((current) => ({
          ...current,
          subnet: { status: "ready", data: result },
        }));
      });
      notify.success("Subnet scan completed", `Discovered ${result.devices.length} active devices on subnet ${result.subnet}.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to scan local subnet.";
      startTransition(() => {
        setState((current) => ({
          ...current,
          subnet: { status: "error", errorMessage: message },
        }));
      });
      notify.error("Subnet scan failed", message);
    }
  });

  const loadWifiNetworks = useEffectEvent(async () => {
    if (!isDesktopRuntime) {
      startTransition(() => {
        setState((current) => ({
          ...current,
          wifiNetworks: { status: "loading" },
          activeWifi: { status: "loading" },
        }));
      });
      await new Promise((resolve) => setTimeout(resolve, 800));
      const mockWifi = [
        {
          ssid: "Orion-HighSpeed-5G",
          authentication: "WPA2-Personal",
          encryption: "CCMP",
          signal: 95,
          band: "5 GHz",
          bssids: [{ bssid: "04:18:B6:AA:BB:CC", signal: 95, channel: 44, frequency: "5 GHz", vendor: "Ubiquiti" }]
        },
        {
          ssid: "Firmandez-Home",
          authentication: "WPA3-Personal",
          encryption: "CCMP",
          signal: 88,
          band: "Mixed",
          bssids: [
            { bssid: "18:E8:29:11:22:33", signal: 82, channel: 6, frequency: "2.4 GHz", vendor: "Ubiquiti" },
            { bssid: "18:E8:29:44:55:66", signal: 88, channel: 149, frequency: "5 GHz", vendor: "Ubiquiti" }
          ]
        },
        {
          ssid: "Starbucks-Free-WiFi",
          authentication: "Open",
          encryption: "None",
          signal: 62,
          band: "2.4 GHz",
          bssids: [{ bssid: "50:2F:9B:AA:DD:EE", signal: 62, channel: 1, frequency: "2.4 GHz", vendor: "TP-Link" }]
        }
      ];
      const mockActive = {
        name: "Wi-Fi 0",
        description: "Intel(R) Wi-Fi 6E AX211 160MHz",
        mac: "AA:BB:CC:11:22:33",
        state: "connected",
        ssid: "Orion-HighSpeed-5G",
        bssid: "04:18:B6:AA:BB:CC",
        signal: 95,
        channel: 44,
        receiveRate: 1201,
        transmitRate: 1201,
        vendor: "Ubiquiti"
      };
      startTransition(() => {
        setState((current) => ({
          ...current,
          wifiNetworks: { status: "ready", data: mockWifi },
          activeWifi: { status: "ready", data: mockActive },
        }));
      });
      notify.success("Wi-Fi scan finished", "Discovered 3 networks in simulated browser environment.");
      return;
    }

    startTransition(() => {
      setState((current) => ({
        ...current,
        wifiNetworks: { status: "loading" },
        activeWifi: { status: "loading" },
      }));
    });

    try {
      const networks = await getWifiNetworks();
      const active = await getActiveWifiInterface();
      startTransition(() => {
        setState((current) => ({
          ...current,
          wifiNetworks: { status: "ready", data: networks },
          activeWifi: { status: "ready", data: active },
        }));
      });
      notify.success("Wi-Fi scan finished", `Discovered ${networks.length} networks near your device.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to retrieve Wi-Fi networks.";
      startTransition(() => {
        setState((current) => ({
          ...current,
          wifiNetworks: { status: "error", errorMessage: message },
          activeWifi: { status: "error", errorMessage: message },
        }));
      });
      notify.error("Wi-Fi scan failed", message);
    }
  });

  const refreshActiveWifi = useEffectEvent(async () => {
    if (!isDesktopRuntime) {
      // In browser demo mode, fluctuate the mock active Wi-Fi signal slightly (e.g. +/- 3%)
      // to make the real-time SVG chart look animated and alive.
      setState((current) => {
        if (current.activeWifi.status === "ready" && current.activeWifi.data) {
          const currentSignal = current.activeWifi.data.signal;
          const delta = Math.floor(Math.random() * 7) - 3;
          const nextSignal = Math.max(30, Math.min(100, currentSignal + delta));
          return {
            ...current,
            activeWifi: {
              ...current.activeWifi,
              data: {
                ...current.activeWifi.data,
                signal: nextSignal,
              },
            },
          };
        }
        return current;
      });
      return;
    }

    try {
      const active = await getActiveWifiInterface();
      startTransition(() => {
        setState((current) => ({
          ...current,
          activeWifi: { status: "ready", data: active },
        }));
      });
    } catch {
      // Silently fail to ensure background polling doesn't display intrusive errors
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
    runSubnetScan: () => void runSubnetScan(),
    loadWifiNetworks: () => void loadWifiNetworks(),
    refreshActiveWifi: () => void refreshActiveWifi(),
  };
}
