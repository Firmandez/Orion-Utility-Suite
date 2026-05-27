import { useEffect, useState } from "react";
import {
  Activity,
  ClipboardCopy,
  Globe2,
  LocateFixed,
  Radar,
  RefreshCw,
  Server,
  ShieldAlert,
  Wifi,
  Cpu,
  Laptop,
  Radio,
  Router,
  Gauge,
  Lock,
  Copy,
  Signal,
  CheckCircle2,
} from "lucide-react";
import { useOutletContext } from "react-router-dom";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorBanner } from "@/components/common/ErrorBanner";
import { PageSection } from "@/components/common/PageSection";
import { ResultCard } from "@/components/common/ResultCard";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { TextArea } from "@/components/ui/TextArea";
import { notify } from "@/components/ui/Toast";
import type { AppBootstrapState, DiscoveredDevice, WifiNetwork } from "@/types/app";
import {
  formatDnsCopy,
  formatDnsRows,
  formatHttpCopy,
  formatHttpRows,
  formatLocalIpCopy,
  formatLocalIpRows,
  formatPingCopy,
  formatPingRows,
  formatPortCopy,
  formatPortRows,
  normalizePortInput,
} from "./network-toolkit.utils";
import { useNetworkToolkit } from "./useNetworkToolkit";

export function NetworkToolkitWorkspace() {
  const bootstrap = useOutletContext<AppBootstrapState>();
  const toolkit = useNetworkToolkit(bootstrap);
  const [activeTab, setActiveTab] = useState<"diagnostics" | "subnet" | "wifi">("diagnostics");

  const {
    localIp,
    dnsDomain,
    dns,
    pingHost,
    ping,
    portHost,
    portValue,
    port,
    httpUrl,
    http,
    subnet,
    wifiNetworks,
    activeWifi,
    isDesktopRuntime,
    setDnsDomain,
    setPingHost,
    setPortHost,
    setPortValue,
    setHttpUrl,
    copyDiagnostic,
    loadLocalIp,
    runDnsLookup,
    runPingHost,
    runPortCheck,
    runHttpStatusCheck,
    runSubnetScan,
    loadWifiNetworks,
    refreshActiveWifi,
  } = toolkit;

  const [signalHistory, setSignalHistory] = useState<number[]>([]);

  // Trigger scan automatically when switching tabs for a premium, instant feel
  useEffect(() => {
    if (activeTab === "subnet") {
      if (subnet.status === "idle") {
        void runSubnetScan();
      }
    } else if (activeTab === "wifi") {
      if (wifiNetworks.status === "idle") {
        void loadWifiNetworks();
      }
    }
  }, [activeTab, subnet.status, wifiNetworks.status, runSubnetScan, loadWifiNetworks]);

  // Poll connected Wi-Fi signal strength dynamically every 3 seconds for real-time history
  useEffect(() => {
    if (activeTab !== "wifi") {
      return;
    }

    const interval = setInterval(() => {
      void refreshActiveWifi();
    }, 3000);

    return () => clearInterval(interval);
  }, [activeTab, refreshActiveWifi]);

  // Track signal history (keep last 20 measurements for a 60-second window)
  useEffect(() => {
    if (activeWifi.data) {
      const sig = activeWifi.data.signal;
      setSignalHistory((prev) => {
        const next = [...prev, sig];
        if (next.length > 20) {
          next.shift();
        }
        return next;
      });
    } else if (activeWifi.status === "error" || activeWifi.status === "idle") {
      setSignalHistory([]);
    }
  }, [activeWifi.data?.signal, activeWifi.status]);

  const connectedBssid = activeWifi.data?.bssid?.toUpperCase();

  // Extract all active channels from nearby scanned BSSIDs, excluding our own connected access point's BSSID
  // so our own router's signal doesn't penalize the channel we are currently using.
  const allApChannels = wifiNetworks.data
    ? wifiNetworks.data.flatMap((net) =>
        net.bssids
          .filter((b) => !connectedBssid || b.bssid.toUpperCase() !== connectedBssid)
          .map((b) => ({
            channel: b.channel,
            signal: b.signal,
            band: b.frequency,
            ssid: net.ssid,
          }))
      )
    : [];

  const activeBand = activeWifi.data
    ? (activeWifi.data.channel >= 36 ? "5 GHz" : "2.4 GHz")
    : "2.4 GHz";

  const get24GHzChannelRatings = () => {
    const allChannels = Array.from({ length: 13 }, (_, i) => i + 1);
    return allChannels.map((chan) => {
      let score = 0;
      let apCount = 0;
      allApChannels.forEach((ap) => {
        if (ap.band === "2.4 GHz" || ap.channel < 36) {
          const diff = Math.abs(ap.channel - chan);
          if (diff < 5) {
            const factor = (5 - diff) / 5.0; // Overlapping weights: 1.0, 0.8, 0.6, 0.4, 0.2
            score += (ap.signal / 100.0) * factor;
            if (diff === 0) apCount++;
          }
        }
      });
      let rating: "Excellent" | "Good" | "Fair" | "Crowded" = "Excellent";
      if (score > 1.5) rating = "Crowded";
      else if (score > 0.8) rating = "Fair";
      else if (score > 0.2) rating = "Good";
      return { channel: chan, score, apCount, rating };
    });
  };

  const get5GHzChannelRatings = () => {
    const common5gChannels = [36, 40, 44, 48, 149, 153, 157, 161];
    return common5gChannels.map((chan) => {
      let score = 0;
      let apCount = 0;
      allApChannels.forEach((ap) => {
        if (ap.band === "5 GHz" || ap.channel >= 36) {
          if (ap.channel === chan) {
            score += ap.signal / 100.0;
            apCount++;
          }
        }
      });
      let rating: "Excellent" | "Good" | "Fair" | "Crowded" = "Excellent";
      if (score > 1.2) rating = "Crowded";
      else if (score > 0.6) rating = "Fair";
      else if (score > 0.1) rating = "Good";
      return { channel: chan, score, apCount, rating };
    });
  };

  const currentChannelNum = activeWifi.data?.channel || 0;

  const getRecommendedChannel = (band: "2.4 GHz" | "5 GHz") => {
    if (band === "2.4 GHz") {
      const ratings = get24GHzChannelRatings().filter((r) => [1, 6, 11].includes(r.channel));
      // Give the currently connected channel a small loyalty bias (0.15 points)
      // to prevent jittery/frequent recommendation updates due to minor signal fluctuations.
      const biasedRatings = ratings.map((r) => {
        let score = r.score;
        if (r.channel === currentChannelNum) {
          score -= 0.15;
        }
        return { ...r, biasedScore: score };
      });
      biasedRatings.sort((a, b) => a.biasedScore - b.biasedScore);
      const best = biasedRatings[0];
      return ratings.find((r) => r.channel === best.channel) || { channel: 11, score: 0, apCount: 0, rating: "Excellent" };
    } else {
      const ratings = get5GHzChannelRatings();
      const biasedRatings = ratings.map((r) => {
        let score = r.score;
        if (r.channel === currentChannelNum) {
          score -= 0.15;
        }
        return { ...r, biasedScore: score };
      });
      biasedRatings.sort((a, b) => a.biasedScore - b.biasedScore);
      const best = biasedRatings[0];
      return ratings.find((r) => r.channel === best.channel) || { channel: 36, score: 0, apCount: 0, rating: "Excellent" };
    }
  };

  const currentChannelRatings = activeBand === "5 GHz" ? get5GHzChannelRatings() : get24GHzChannelRatings();
  const recommendedChannelObj = getRecommendedChannel(activeBand);
  
  const currentChannelObj = currentChannelRatings.find((r) => r.channel === currentChannelNum);

  function getRatingStyle(rating: string) {
    switch (rating) {
      case "Excellent": return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
      case "Good": return "bg-cyan-500/10 text-cyan-400 border-cyan-500/20";
      case "Fair": return "bg-amber-500/10 text-amber-400 border-amber-500/20";
      case "Crowded": return "bg-rose-500/10 text-rose-400 border-rose-500/20";
      default: return "bg-slate-500/10 text-slate-400 border-slate-500/20";
    }
  }

  // Helper for rendering custom vendor colors on discovered devices
  function getVendorStyle(vendor: string) {
    const v = vendor.toLowerCase();
    if (v.includes("apple")) return "bg-slate-500/10 text-slate-300 border-slate-500/20";
    if (v.includes("tp-link")) return "bg-cyan-500/10 text-cyan-300 border-cyan-500/20";
    if (v.includes("ubiquiti")) return "bg-blue-600/10 text-blue-300 border-blue-600/20";
    if (v.includes("intel")) return "bg-sky-500/10 text-sky-300 border-sky-500/20";
    if (v.includes("raspberry")) return "bg-rose-500/10 text-rose-300 border-rose-500/20";
    if (v.includes("samsung")) return "bg-indigo-500/10 text-indigo-300 border-indigo-500/20";
    if (v.includes("xiaomi")) return "bg-orange-500/10 text-orange-300 border-orange-500/20";
    if (v.includes("google")) return "bg-green-500/10 text-green-300 border-green-500/20";
    
    // Privacy and local host mapping
    if (v.includes("private")) return "bg-amber-500/10 text-amber-300 border-amber-500/20";
    if (v === "self") return "bg-emerald-500/10 text-emerald-300 border-emerald-500/20";
    
    // IoT and Smart Home
    if (v.includes("espressif") || v.includes("tuya")) {
      return "bg-fuchsia-500/10 text-fuchsia-300 border-fuchsia-500/20";
    }
    
    // Network equipment and routers
    if (
      v.includes("asus") ||
      v.includes("netgear") ||
      v.includes("linksys") ||
      v.includes("d-link") ||
      v.includes("cisco") ||
      v.includes("tenda") ||
      v.includes("fiberhome") ||
      v.includes("zte")
    ) {
      return "bg-teal-500/10 text-teal-300 border-teal-500/20";
    }
    
    // Other Mobile / Smart devices
    if (
      v.includes("vivo") ||
      v.includes("oppo") ||
      v.includes("realme") ||
      v.includes("huawei") ||
      v.includes("transsion")
    ) {
      return "bg-rose-500/10 text-rose-300 border-rose-500/20";
    }

    if (v.includes("virtualbox") || v.includes("vmware") || v.includes("parallels")) {
      return "bg-purple-500/10 text-purple-300 border-purple-500/20";
    }
    return "bg-slate-500/5 text-slate-400 border-slate-500/10";
  }

  // Device card icon selector
  function getDeviceIcon(deviceType: string) {
    const t = deviceType.toLowerCase();
    if (t.includes("gateway") || t.includes("router")) return Router;
    if (t.includes("local pc") || t.includes("desktop")) return Laptop;
    return Cpu;
  }

  // Device type badge color
  function getTypeBadgeStyle(deviceType: string) {
    const t = deviceType.toLowerCase();
    if (t.includes("gateway")) return "bg-amber-500/15 text-amber-300 border-amber-500/20";
    if (t.includes("local pc")) return "bg-emerald-500/15 text-emerald-300 border-emerald-500/20";
    return "bg-sky-500/10 text-sky-400 border-sky-500/15";
  }

  // Wi-Fi signal strength color coding
  function getSignalColor(pct: number) {
    if (pct >= 80) return "bg-emerald-500 text-emerald-400";
    if (pct >= 55) return "bg-cyan-400 text-cyan-400";
    if (pct >= 35) return "bg-amber-400 text-amber-400";
    return "bg-rose-500 text-rose-500";
  }

  return (
    <div className="space-y-6">
      {/* Premium Dynamic Tab Selector */}
      <div className="flex border-b border-(--border-subtle) pb-px gap-2">
        <button
          onClick={() => setActiveTab("diagnostics")}
          className={`flex items-center gap-2.5 px-5 py-3 text-sm font-medium border-b-2 transition-all duration-200 cursor-pointer ${
            activeTab === "diagnostics"
              ? "border-(--accent) text-(--text-primary) bg-(--accent-surface)/5"
              : "border-transparent text-(--text-muted) hover:text-(--text-secondary)"
          }`}
        >
          <Activity className="h-4.5 w-4.5" />
          Diagnostics
        </button>
        <button
          onClick={() => setActiveTab("subnet")}
          className={`flex items-center gap-2.5 px-5 py-3 text-sm font-medium border-b-2 transition-all duration-200 cursor-pointer ${
            activeTab === "subnet"
              ? "border-(--accent) text-(--text-primary) bg-(--accent-surface)/5"
              : "border-transparent text-(--text-muted) hover:text-(--text-secondary)"
          }`}
        >
          <Radar className="h-4.5 w-4.5" />
          Subnet Scanner
        </button>
        <button
          onClick={() => setActiveTab("wifi")}
          className={`flex items-center gap-2.5 px-5 py-3 text-sm font-medium border-b-2 transition-all duration-200 cursor-pointer ${
            activeTab === "wifi"
              ? "border-(--accent) text-(--text-primary) bg-(--accent-surface)/5"
              : "border-transparent text-(--text-muted) hover:text-(--text-secondary)"
          }`}
        >
          <Wifi className="h-4.5 w-4.5" />
          Wi-Fi Analyzer
        </button>
      </div>

      {/* ============================================================== */}
      {/* TAB 1: BASIC DIAGNOSTICS                                       */}
      {/* ============================================================== */}
      {activeTab === "diagnostics" && (
        <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="grid items-start gap-5 xl:grid-cols-[1fr_1fr]">
            <PageSection
              title="Local IP"
              description="Shows your device's local IP, subnet, gateway, DNS servers, and IP assignment mode."
              actions={
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    leadingIcon={ClipboardCopy}
                    onClick={() => copyDiagnostic("local IP", formatLocalIpCopy(localIp.data))}
                    disabled={!localIp.data}
                  >
                    Copy
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    leadingIcon={RefreshCw}
                    onClick={loadLocalIp}
                    loading={localIp.status === "loading"}
                    disabled={!isDesktopRuntime}
                  >
                    Refresh
                  </Button>
                </div>
              }
            >
              {localIp.errorMessage ? (
                <ErrorBanner title="Failed to fetch local IP" message={localIp.errorMessage} />
              ) : localIp.data ? (
                <ResultCard
                  title="Network Interface Summary"
                  rows={formatLocalIpRows(localIp.data)}
                />
              ) : (
                <EmptyState
                  icon={LocateFixed}
                  title={localIp.status === "loading" ? "Fetching local IP..." : "Local IP not available"}
                  description={
                    localIp.status === "loading"
                      ? "Orion is reading your device's local IP."
                      : "Open the Orion desktop app or click Refresh to try again."
                  }
                />
              )}
            </PageSection>

            <PageSection
              title="DNS Lookup"
              description="Look up A/AAAA records for a domain or host."
              actions={
                <Button
                  variant="outline"
                  size="sm"
                  leadingIcon={ClipboardCopy}
                  onClick={() => copyDiagnostic("DNS lookup", formatDnsCopy(dns.data))}
                  disabled={!dns.data}
                >
                  Copy
                </Button>
              }
            >
              <div className="space-y-4">
                <Input
                  label="Domain or host"
                  hint="Example: example.com, openai.com, localhost, or an IP address."
                  value={dnsDomain}
                  onChange={(event) => setDnsDomain(event.target.value)}
                />
                <Button leadingIcon={Globe2} onClick={runDnsLookup} loading={dns.status === "loading"} disabled={!isDesktopRuntime}>
                  Run DNS lookup
                </Button>

                {dns.errorMessage ? <ErrorBanner title="DNS lookup failed" message={dns.errorMessage} /> : null}

                {dns.data ? (
                  <ResultCard
                    title="DNS Results"
                    rows={formatDnsRows(dns.data)}
                    footer={
                      <div className="space-y-2">
                        {dns.data.addresses.map((address) => (
                          <div key={address} className="rounded-xl border bg-black/10 px-3 py-2.5 font-mono text-sm text-(--text-primary)">
                            {address}
                          </div>
                        ))}
                      </div>
                    }
                  />
                ) : dns.status === "loading" ? (
                  <EmptyState
                    icon={Radar}
                    title="Running DNS lookup..."
                    description="Resolver is checking the IP address for the domain you entered."
                  />
                ) : (
                  <EmptyState
                    icon={Globe2}
                    title="No DNS results yet"
                    description="Enter a domain and run a lookup to see the resolved IP addresses."
                  />
                )}
              </div>
            </PageSection>
          </div>

          <div className="grid items-start gap-5 xl:grid-cols-[1fr_1fr]">
            <PageSection
              title="Ping Host"
              description="Check if a host or IP is reachable."
              actions={
                <Button
                  variant="outline"
                  size="sm"
                  leadingIcon={ClipboardCopy}
                  onClick={() => copyDiagnostic("ping", formatPingCopy(ping.data))}
                  disabled={!ping.data}
                >
                  Copy
                </Button>
              }
            >
              <div className="space-y-4">
                <Input
                  label="Host"
                  hint="Example: example.com, 1.1.1.1, localhost."
                  value={pingHost}
                  onChange={(event) => setPingHost(event.target.value)}
                />
                <Button leadingIcon={Activity} onClick={runPingHost} loading={ping.status === "loading"} disabled={!isDesktopRuntime}>
                  Run ping
                </Button>

                {ping.errorMessage ? <ErrorBanner title="Ping failed" message={ping.errorMessage} /> : null}

                {ping.data ? (
                  <div className="space-y-4">
                    <ResultCard title="Ping Summary" rows={formatPingRows(ping.data)} />
                    <TextArea
                      label="Ping output"
                      hint={ping.data.summary}
                      value={ping.data.output || "No additional details from the ping process."}
                      readOnly
                      className="min-h-[220px] font-mono text-[13px]"
                    />
                  </div>
                ) : ping.status === "loading" ? (
                  <EmptyState
                    icon={Activity}
                    title="Running ping..."
                    description="Orion is checking if the target is reachable."
                  />
                ) : (
                  <EmptyState
                    icon={Activity}
                    title="No ping results yet"
                    description="Enter a host and run a ping to check reachability."
                  />
                )}
              </div>
            </PageSection>

            <PageSection
              title="Port Checker"
              description="Check if a specific TCP port is accessible."
              actions={
                <Button
                  variant="outline"
                  size="sm"
                  leadingIcon={ClipboardCopy}
                  onClick={() => copyDiagnostic("port checker", formatPortCopy(port.data))}
                  disabled={!port.data}
                >
                  Copy
                </Button>
              }
            >
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-[1fr_140px]">
                  <Input
                    label="Host"
                    hint="Example: example.com or localhost."
                    value={portHost}
                    onChange={(event) => setPortHost(event.target.value)}
                  />
                  <Input
                    label="Port"
                    hint="1-65535"
                    inputMode="numeric"
                    value={portValue}
                    onChange={(event) => setPortValue(normalizePortInput(event.target.value))}
                  />
                </div>
                <Button leadingIcon={Server} onClick={runPortCheck} loading={port.status === "loading"} disabled={!isDesktopRuntime}>
                  Check port
                </Button>

                {port.errorMessage ? <ErrorBanner title="Port check failed" message={port.errorMessage} /> : null}

                {port.data ? (
                  <ResultCard title="Port Check Result" rows={formatPortRows(port.data)} footer={<SummaryCard summary={port.data.summary} />} />
                ) : port.status === "loading" ? (
                  <EmptyState
                    icon={Server}
                    title="Checking port..."
                    description="Orion is attempting a TCP connection to the specified host and port."
                  />
                ) : (
                  <EmptyState
                    icon={Server}
                    title="No port check results yet"
                    description="Enter a host and port, then run a check to see if the port is open."
                  />
                )}
              </div>
            </PageSection>
          </div>

          <PageSection
            title="HTTP Status Checker"
            description="Check the HTTP/HTTPS status of a URL."
            actions={
              <Button
                variant="outline"
                size="sm"
                leadingIcon={ClipboardCopy}
                onClick={() => copyDiagnostic("HTTP status", formatHttpCopy(http.data))}
                disabled={!http.data}
              >
                Copy
              </Button>
            }
          >
            <div className="grid items-start gap-5 xl:grid-cols-[0.9fr_1.1fr]">
              <div className="space-y-4">
                <Input
                  label="URL"
                  hint="Example: https://example.com or just example.com for auto-https."
                  value={httpUrl}
                  onChange={(event) => setHttpUrl(event.target.value)}
                />
                <Button leadingIcon={ShieldAlert} onClick={runHttpStatusCheck} loading={http.status === "loading"} disabled={!isDesktopRuntime}>
                  Check HTTP status
                </Button>

                {http.errorMessage ? <ErrorBanner title="HTTP status check failed" message={http.errorMessage} /> : null}
              </div>

              <div>
                {http.data ? (
                  <ResultCard title="HTTP Result" rows={formatHttpRows(http.data)} footer={<SummaryCard summary={http.data.summary} />} />
                ) : http.status === "loading" ? (
                  <EmptyState
                    icon={ShieldAlert}
                    title="Sending HTTP request..."
                    description="Orion is reading the status from the target URL."
                  />
                ) : (
                  <EmptyState
                    icon={ShieldAlert}
                    title="No HTTP results yet"
                    description="Enter a URL and run a check to see the status code, final URL, and summary."
                  />
                )}
              </div>
            </div>
          </PageSection>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 2: NATIVE SUBNET SCANNER                                   */}
      {/* ============================================================== */}
      {activeTab === "subnet" && (
        <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <PageSection
            title="Subnet Scanner"
            description="Performs a high-speed active discovery swept via parallel UDP probes, resolving device MAC addresses, vendors, and local hostnames in 1-2 seconds."
            actions={
              <div className="flex gap-3">
                <Button
                  variant="primary"
                  size="sm"
                  leadingIcon={Radar}
                  onClick={runSubnetScan}
                  loading={subnet.status === "loading"}
                >
                  {subnet.data ? "Rescan Subnet" : "Scan Subnet"}
                </Button>
              </div>
            }
          >
            {!isDesktopRuntime && (
              <div className="mb-4 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-amber-300 flex items-start gap-3">
                <ShieldAlert className="h-5 w-5 mt-0.5 shrink-0" />
                <div>
                  <div className="font-semibold text-sm">Browser Demo Mode</div>
                  <div className="text-xs mt-0.5 text-amber-400/80">
                    Network sweeps require raw local kernel access. Running in browser will return simulated local network environments.
                  </div>
                </div>
              </div>
            )}

            {subnet.status === "loading" ? (
              <div className="flex flex-col items-center justify-center py-16 border rounded-2xl bg-black/10 border-(--border-subtle)">
                {/* Radar animation sweep */}
                <div className="relative flex items-center justify-center h-28 w-28 mb-6">
                  <div className="absolute inset-0 rounded-full border-2 border-(--accent)/30 animate-ping" />
                  <div className="absolute inset-4 rounded-full border border-(--accent)/40" />
                  <div className="absolute h-full w-full rounded-full border border-(--accent)/20 animate-[spin_3s_linear_infinite] after:content-[''] after:absolute after:top-0 after:left-1/2 after:h-1/2 after:w-1/2 after:bg-gradient-to-tr after:from-(--accent)/40 after:to-transparent after:rounded-tr-full" />
                  <Radar className="h-10 w-10 text-(--accent) animate-[pulse_1.5s_ease-in-out_infinite]" />
                </div>
                <div className="text-lg font-semibold text-(--text-primary)">Sweeping Local Subnet...</div>
                <div className="text-sm text-(--text-muted) mt-1.5 max-w-sm text-center">
                  Sending dynamic sweeps and interrogating the system's ARP cache.
                </div>
              </div>
            ) : subnet.errorMessage ? (
              <ErrorBanner title="Failed to scan subnet" message={subnet.errorMessage} />
            ) : subnet.data ? (
              <div className="space-y-5">
                {/* Summary Banner */}
                <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
                    <div>
                      <div className="font-semibold text-sm text-emerald-300"> pemindaian Selesai!</div>
                      <div className="text-xs text-emerald-400/80 mt-0.5">
                        Ditemukan <span className="font-bold text-emerald-300">{subnet.data.devices.length} perangkat aktif</span> pada segmen subnet <span className="font-mono bg-black/30 px-1.5 py-0.5 rounded text-emerald-300">{subnet.data.subnet}</span>.
                      </div>
                    </div>
                  </div>
                  <div className="text-xs font-medium text-slate-400">
                    IP Anda: <span className="font-mono text-(--accent)">{subnet.data.localIp}</span>
                  </div>
                </div>

                {/* Devices Grid */}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {subnet.data.devices.map((device: DiscoveredDevice) => {
                    const DeviceIcon = getDeviceIcon(device.deviceType);
                    return (
                      <div
                        key={device.ip}
                        className="surface-panel p-4 flex flex-col justify-between gap-4 hover:border-(--accent-soft) hover:shadow-lg transition-all duration-200"
                      >
                        <div className="space-y-2.5">
                          <div className="flex items-start justify-between gap-2">
                            {/* Device Icon & IP */}
                            <div className="flex items-center gap-3">
                              <div className="p-2.5 rounded-xl bg-black/25 border border-(--border-subtle) text-(--accent)">
                                <DeviceIcon className="h-5 w-5" />
                              </div>
                              <div>
                                <div className="font-mono font-bold text-base text-(--text-primary)">
                                  {device.ip}
                                </div>
                                <div className="text-xs text-(--text-muted) truncate max-w-[130px]" title={device.hostname}>
                                  {device.hostname !== "Unknown" ? device.hostname : "No hostname"}
                                </div>
                              </div>
                            </div>
                            {/* Device Type Badge */}
                            <span className={`px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded-md border ${getTypeBadgeStyle(device.deviceType)}`}>
                              {device.deviceType}
                            </span>
                          </div>

                          {/* MAC & Copy Button */}
                          <div className="flex items-center justify-between text-xs border-t border-(--border-subtle)/40 pt-2.5">
                            <span className="text-(--text-muted)">MAC Address:</span>
                            <div className="flex items-center gap-1.5 font-mono text-(--text-secondary)">
                              <span>{device.mac}</span>
                              {device.mac !== "Local Loopback" && (
                                <button
                                  onClick={async () => {
                                    await navigator.clipboard.writeText(device.mac);
                                    notify.success("MAC Copied", `Copied ${device.mac} to clipboard.`);
                                  }}
                                  className="p-1 hover:text-(--accent) rounded hover:bg-white/5 transition-all"
                                  title="Copy MAC Address"
                                >
                                  <Copy className="h-3 w-3" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Vendor Pill */}
                        <div className="flex items-center justify-between border-t border-(--border-subtle)/40 pt-2.5">
                          <span className="text-xs text-(--text-muted)">Hardware Vendor:</span>
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getVendorStyle(device.vendor)}`}>
                            {device.vendor}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <EmptyState
                icon={Radar}
                title="Subnet Scanner Ready"
                description="Click Scan Subnet above to automatically query active devices on your local network."
              />
            )}
          </PageSection>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 3: WI-FI ANALYZER                                          */}
      {/* ============================================================== */}
      {activeTab === "wifi" && (
        <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-200">
          {/* Active Interface Header */}
          <PageSection
            title="Active Interface"
            description="Details of your currently connected Wi-Fi interface and wireless network connection speed."
            actions={
              <Button
                variant="primary"
                size="sm"
                leadingIcon={RefreshCw}
                onClick={loadWifiNetworks}
                loading={wifiNetworks.status === "loading"}
              >
                Scan & Refresh
              </Button>
            }
          >
            {activeWifi.errorMessage ? (
              <ErrorBanner title="Failed to read active connection" message={activeWifi.errorMessage} />
            ) : activeWifi.data ? (
              <div className="space-y-5">
                <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                  {/* Connection Status Card */}
                  <div className="surface-panel p-5 relative overflow-hidden border border-emerald-500/25 bg-emerald-500/[0.02]">
                    <div className="absolute right-[-10px] top-[-10px] text-emerald-500/5 rotate-12">
                      <Wifi className="h-28 w-28" />
                    </div>
                    <div className="flex items-center gap-3.5 mb-4">
                      <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <Wifi className="h-6 w-6" />
                      </div>
                      <div>
                        <div className="text-xs uppercase tracking-wider text-emerald-400/80 font-bold">Connected SSID</div>
                        <div className="text-xl font-bold text-emerald-300 font-display mt-0.5">{activeWifi.data.ssid}</div>
                      </div>
                    </div>
                    <div className="space-y-2 text-xs border-t border-emerald-500/10 pt-4">
                      <div className="flex justify-between">
                        <span className="text-(--text-muted)">State:</span>
                        <span className="font-semibold text-emerald-400 capitalize">{activeWifi.data.state}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-(--text-muted)">Access Point (BSSID):</span>
                        <span className="font-mono text-(--text-secondary)">{activeWifi.data.bssid}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-(--text-muted)">Hardware Vendor:</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${getVendorStyle(activeWifi.data.vendor)}`}>
                          {activeWifi.data.vendor}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-(--text-muted)">Security:</span>
                        <span className="font-medium text-slate-300 flex items-center gap-1">
                          <Lock className="h-3 w-3 text-emerald-400" />
                          Encrypted CCMP
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Adapter & Channels Card */}
                  <div className="surface-panel p-5 relative overflow-hidden">
                    <div className="absolute right-[-10px] top-[-10px] text-(--accent)/5 rotate-12">
                      <Radio className="h-28 w-28" />
                    </div>
                    <div className="flex items-center gap-3.5 mb-4">
                      <div className="p-3 rounded-2xl bg-(--accent-surface) text-(--accent) border border-(--border-strong)">
                        <Radio className="h-6 w-6" />
                      </div>
                      <div>
                        <div className="text-xs uppercase tracking-wider text-(--text-muted) font-bold">Adapter & Band</div>
                        <div className="text-base font-bold text-(--text-primary) mt-0.5 truncate max-w-[200px]" title={activeWifi.data.description}>
                          {activeWifi.data.description}
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2 text-xs border-t border-(--border-subtle) pt-4">
                      <div className="flex justify-between">
                        <span className="text-(--text-muted)">Interface Name:</span>
                        <span className="font-medium text-(--text-secondary)">{activeWifi.data.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-(--text-muted)">Operating Channel:</span>
                        <span className="font-bold text-(--accent)">Channel {activeWifi.data.channel}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-(--text-muted)">Frequency Band:</span>
                        <span className="font-medium text-(--text-secondary)">
                          {activeWifi.data.channel >= 36 ? "5 GHz (High Band)" : "2.4 GHz (Low Band)"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Speed & Signal Card */}
                  <div className="surface-panel p-5 relative overflow-hidden">
                    <div className="absolute right-[-10px] top-[-10px] text-sky-500/5 rotate-12">
                      <Gauge className="h-28 w-28" />
                    </div>
                    <div className="flex items-center gap-3.5 mb-4">
                      <div className="p-3 rounded-2xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
                        <Gauge className="h-6 w-6" />
                      </div>
                      <div>
                        <div className="text-xs uppercase tracking-wider text-(--text-muted) font-bold">Signal & Speeds</div>
                        <div className="text-base font-bold text-(--text-primary) mt-0.5 flex items-center gap-2">
                          <span>{activeWifi.data.signal}% Strength</span>
                          <div className={`h-2.5 w-2.5 rounded-full ${getSignalColor(activeWifi.data.signal).split(" ")[0]}`} />
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2 text-xs border-t border-(--border-subtle) pt-4">
                      <div className="flex justify-between">
                        <span className="text-(--text-muted)">Receive Rate (Rx):</span>
                        <span className="font-bold text-(--text-primary)">{activeWifi.data.receiveRate} Mbps</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-(--text-muted)">Transmit Rate (Tx):</span>
                        <span className="font-bold text-(--text-primary)">{activeWifi.data.transmitRate} Mbps</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-(--text-muted)">Adapter MAC:</span>
                        <span className="font-mono text-(--text-secondary)">{activeWifi.data.mac}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Real-time Signal Strength History Chart Card */}
                <div className="surface-panel p-5 relative overflow-hidden border border-(--border-subtle) animate-in fade-in duration-300">
                  <div className="text-sm font-semibold mb-4 text-(--text-primary) flex items-center gap-2">
                    <Signal className="h-4.5 w-4.5 text-(--accent) animate-[pulse_1.5s_ease-in-out_infinite]" />
                    Real-time Connected Signal Strength History (Last 60s)
                  </div>

                  <div className="relative h-40 w-full bg-black/15 rounded-xl border border-(--border-subtle)/30 p-3 flex flex-col justify-between overflow-hidden">
                    {/* SVG Chart */}
                    <svg className="absolute inset-0 h-full w-full" viewBox="0 0 500 100" preserveAspectRatio="none">
                      <defs>
                        {/* Glowing Line Gradient */}
                        <linearGradient id="signal-gradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.4" />
                          <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.0" />
                        </linearGradient>
                      </defs>

                      {/* Horizontal Grid Lines */}
                      <line x1="0" y1="10" x2="500" y2="10" stroke="var(--border-subtle)" strokeOpacity="0.2" strokeDasharray="3,3" />
                      <line x1="0" y1="36" x2="500" y2="36" stroke="var(--border-subtle)" strokeOpacity="0.15" strokeDasharray="3,3" />
                      <line x1="0" y1="63" x2="500" y2="63" stroke="var(--border-subtle)" strokeOpacity="0.15" strokeDasharray="3,3" />
                      <line x1="0" y1="90" x2="500" y2="90" stroke="var(--border-subtle)" strokeOpacity="0.2" strokeDasharray="3,3" />

                      {signalHistory.length >= 2 ? (
                        <>
                          {/* Area Path */}
                          <path
                            d={`M 0 90 L ${signalHistory.map((sig, idx) => {
                              const x = (idx / (signalHistory.length - 1)) * 500;
                              const y = 90 - (sig / 100) * 80;
                              return `${x} ${y}`;
                            }).join(" L ")} L 500 90 Z`}
                            fill="url(#signal-gradient)"
                            className="transition-all duration-300 ease-in-out"
                          />

                          {/* Line Path */}
                          <path
                            d={`M ${signalHistory.map((sig, idx) => {
                              const x = (idx / (signalHistory.length - 1)) * 500;
                              const y = 90 - (sig / 100) * 80;
                              return `${x} ${y}`;
                            }).join(" L ")}`}
                            fill="none"
                            stroke="var(--accent)"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="transition-all duration-300 ease-in-out"
                          />
                        </>
                      ) : null}
                    </svg>

                    {/* Chart Grid Labels (Right-aligned to follow incoming data) */}
                    <div className="absolute right-3.5 top-2.5 text-[9px] font-mono text-(--text-muted) select-none">
                      100% Excellent
                    </div>
                    <div className="absolute right-3.5 top-[52px] text-[9px] font-mono text-(--text-muted) select-none">
                      50% Fair
                    </div>
                    <div className="absolute right-3.5 bottom-2.5 text-[9px] font-mono text-(--text-muted) select-none">
                      0% Dead Zone
                    </div>

                    {/* Left-aligned Stats HUD overlay (Clears the active right-hand side) */}
                    {activeWifi.data && (
                      <div className="absolute left-3.5 top-3.5 flex items-center gap-3 bg-black/60 border border-(--border-subtle)/40 rounded-xl px-3 py-1.5 text-xs z-10">
                        <span className="text-(--text-muted)">Current:</span>
                        <span className="font-bold text-(--accent) animate-[pulse_1.5s_ease-in-out_infinite]">{activeWifi.data.signal}%</span>
                        <div className="h-3 w-px bg-(--border-subtle)/50" />
                        <span className="text-(--text-muted)">Status:</span>
                        <span className={`font-semibold uppercase tracking-wider text-[10px] px-2 py-0.5 rounded-md ${
                          activeWifi.data.signal >= 80 ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                          activeWifi.data.signal >= 55 ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20" :
                          activeWifi.data.signal >= 35 ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" :
                          "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                        }`}>
                          {activeWifi.data.signal >= 80 ? "Excellent" :
                           activeWifi.data.signal >= 55 ? "Good" :
                           activeWifi.data.signal >= 35 ? "Fair" : "Poor"}
                        </span>
                      </div>
                    )}

                    {signalHistory.length < 2 && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/35 rounded-xl z-20">
                        <span className="text-xs text-(--text-muted) flex items-center gap-2">
                          <RefreshCw className="h-3.5 w-3.5 animate-spin text-(--accent)" />
                          Gathering signal history telemetry...
                        </span>
                      </div>
                    )}
                  </div>
                  
                  <div className="text-[10px] text-(--text-muted) mt-2 flex justify-between">
                    <span>60s ago</span>
                    <span>30s ago</span>
                    <span>Just now (3s updates)</span>
                  </div>
                </div>
              </div>
            ) : activeWifi.status === "loading" ? (
              <div className="flex items-center justify-center p-8 border rounded-2xl bg-black/5">
                <div className="text-sm text-(--text-muted) flex items-center gap-2">
                  <RefreshCw className="h-4 w-4 animate-spin text-(--accent)" />
                  Reading active adapter details...
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-amber-300 text-xs">
                No active Wi-Fi connection detected. Connect to a network and scan again.
              </div>
            )}
          </PageSection>

          {/* Channel Optimizer Card */}
          {wifiNetworks.data && wifiNetworks.data.length > 0 && activeWifi.data && (
            <PageSection
              title="Channel Optimizer"
              description="Analyzes surrounding channels to compute overlap interference weights, helping you select the quietest, most stable frequency channel for your Wi-Fi router."
            >
              <div className="grid gap-5 lg:grid-cols-2">
                {/* Left Card: Recommendation */}
                <div className="surface-panel p-5 relative overflow-hidden border border-(--accent-soft) bg-(--accent-surface)/5 animate-in fade-in duration-300">
                  <div className="absolute right-[-10px] top-[-10px] text-(--accent)/5 rotate-12">
                    <Radar className="h-28 w-28" />
                  </div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-3 rounded-2xl bg-(--accent-surface) text-(--accent) border border-(--border-strong)">
                      <CheckCircle2 className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-xs uppercase tracking-wider text-(--text-muted) font-bold">Optimization Advisory</div>
                      <h3 className="text-lg font-bold text-(--text-primary) font-display mt-0.5">Quiet Channel Recommendation</h3>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="rounded-xl bg-black/20 p-4 border border-(--border-subtle)">
                      <div className="text-xs text-(--text-muted)">RECOMMENDED FOR YOUR {activeBand.toUpperCase()} NETWORK</div>
                      <div className="flex items-baseline gap-3 mt-2">
                        <span className="text-3xl font-extrabold text-(--accent) font-display">Channel {recommendedChannelObj.channel}</span>
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getRatingStyle(recommendedChannelObj.rating)}`}>
                          Rating: {recommendedChannelObj.rating}
                        </span>
                      </div>
                      <div className="text-xs text-(--text-secondary) mt-2">
                        {recommendedChannelObj.apCount} active APs directly on this channel. Lowest calculated interference score ({recommendedChannelObj.score.toFixed(2)}).
                      </div>
                    </div>

                    <div className="text-xs space-y-2 border-t border-(--border-subtle)/40 pt-4">
                      <div className="flex justify-between">
                        <span className="text-(--text-muted)">Current Connected Channel:</span>
                        <span className="font-bold text-(--text-primary)">Channel {currentChannelNum}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-(--text-muted)">Current Channel Rating:</span>
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold border uppercase tracking-wider ${getRatingStyle(currentChannelObj?.rating || "Excellent")}`}>
                          {currentChannelObj?.rating || "Excellent"}
                        </span>
                      </div>
                      
                      {currentChannelNum === recommendedChannelObj.channel ? (
                        <div className="mt-3 text-emerald-400 text-xs font-semibold flex items-center gap-1.5 bg-emerald-500/10 p-2.5 rounded-xl border border-emerald-500/20">
                          <CheckCircle2 className="h-4 w-4 shrink-0" />
                          Excellent! You are already connected to the best available channel in this band.
                        </div>
                      ) : (
                        <div className="mt-3 text-amber-400 text-xs font-medium flex items-start gap-1.5 bg-amber-500/10 p-2.5 rounded-xl border border-amber-500/20">
                          <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
                          <span>
                            Current Channel {currentChannelNum} is crowded/sub-optimal. Consider changing your router's wireless settings to **Channel {recommendedChannelObj.channel}** for better speeds and stability.
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Card: Channel Grid Map */}
                <div className="surface-panel p-5">
                  <div className="text-sm font-semibold mb-4 text-(--text-primary) flex items-center gap-2">
                    <Signal className="h-4.5 w-4.5 text-(--accent)" />
                    Channel Occupancy Rating List ({activeBand})
                  </div>
                  
                  <div className="grid gap-2.5 max-h-[300px] overflow-y-auto pr-1">
                    {(activeBand === "2.4 GHz" ? get24GHzChannelRatings().filter(r => [1, 6, 11].includes(r.channel)) : get5GHzChannelRatings()).map((item) => (
                      <div key={item.channel} className="flex items-center justify-between p-3 rounded-xl bg-black/15 border border-(--border-subtle)/30">
                        <div className="flex items-center gap-3">
                          <div className="size-8 rounded-lg bg-black/35 flex items-center justify-center font-mono font-bold text-sm text-(--accent)">
                            {item.channel}
                          </div>
                          <div>
                            <div className="text-xs font-bold text-(--text-secondary)">Channel {item.channel}</div>
                            <div className="text-[10px] text-(--text-muted) mt-0.5">
                              {item.apCount} direct APs • Overlap score: {item.score.toFixed(2)}
                            </div>
                          </div>
                        </div>
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getRatingStyle(item.rating)}`}>
                          {item.rating}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </PageSection>
          )}

          {/* Nearby Networks Sweeper */}
          <PageSection
            title="Nearby Wi-Fi Networks"
            description="Graphic representation of surrounding wireless channels, signal levels, encryption standards, and AP bands."
          >
            {wifiNetworks.errorMessage ? (
              <ErrorBanner title="Wi-Fi Sweep Failed" message={wifiNetworks.errorMessage} />
            ) : wifiNetworks.data && wifiNetworks.data.length > 0 ? (
              <div className="space-y-6">
                {/* Visualizer Chart */}
                <div className="surface-panel p-5">
                  <div className="text-sm font-semibold mb-4 text-(--text-primary) flex items-center gap-2">
                    <Signal className="h-4.5 w-4.5 text-(--accent)" />
                    Signal Strength Comparison Map
                  </div>
                  <div className="space-y-3.5">
                    {wifiNetworks.data.map((net: WifiNetwork) => (
                      <div key={net.ssid} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold font-display text-(--text-secondary) flex items-center gap-2">
                            {net.ssid}
                            {net.authentication.toLowerCase().includes("open") ? (
                              <span className="text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded font-mono font-medium">OPEN</span>
                            ) : (
                              <span className="text-[9px] bg-sky-500/10 text-sky-400 border border-sky-500/20 px-1.5 py-0.5 rounded font-mono font-medium flex items-center gap-0.5">
                                <Lock className="h-2 w-2" />
                                WPA SECURE
                              </span>
                            )}
                          </span>
                          <span className={`font-semibold font-mono ${getSignalColor(net.signal).split(" ")[1]}`}>
                            {net.signal}%
                          </span>
                        </div>
                        {/* CSS Progress Bar */}
                        <div className="h-2.5 w-full bg-black/25 rounded-full overflow-hidden border border-(--border-subtle)/30">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${getSignalColor(net.signal).split(" ")[0]}`}
                            style={{ width: `${net.signal}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Networks Detail List */}
                <div className="grid gap-4 sm:grid-cols-2">
                  {wifiNetworks.data.map((net: WifiNetwork) => (
                    <div key={net.ssid} className="surface-panel p-4 flex flex-col justify-between gap-4">
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="font-bold text-base text-(--text-primary) font-display leading-tight truncate max-w-[190px]">
                              {net.ssid}
                            </div>
                            <div className="text-xs text-(--text-muted) mt-0.5">
                              {net.authentication} • {net.encryption}
                            </div>
                          </div>
                          <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full border ${
                            net.band === "5 GHz"
                              ? "bg-purple-500/10 text-purple-300 border-purple-500/20"
                              : net.band === "2.4 GHz"
                              ? "bg-amber-500/10 text-amber-300 border-amber-500/20"
                              : "bg-teal-500/10 text-teal-300 border-teal-500/20"
                          }`}>
                            {net.band}
                          </span>
                        </div>

                        {/* Expandable BSSID stats */}
                        <div className="mt-4 border-t border-(--border-subtle)/40 pt-3 space-y-2 text-xs">
                          {net.bssids.map((bssid) => (
                            <div key={bssid.bssid} className="flex flex-col gap-2.5 bg-black/20 p-3 rounded-xl border border-(--border-subtle)/20">
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-mono text-(--text-secondary) font-medium" title="BSSID MAC">
                                  {bssid.bssid}
                                </span>
                                <span className={`px-2 py-0.5 rounded text-[9px] font-semibold border ${getVendorStyle(bssid.vendor)}`}>
                                  {bssid.vendor}
                                </span>
                              </div>
                              <div className="flex items-center justify-between border-t border-(--border-subtle)/10 pt-2 text-[10px] text-(--text-muted)">
                                <span>Signal: <span className="font-bold text-(--text-primary)">{bssid.signal}%</span></span>
                                <span>Band: <span className="font-medium text-(--text-secondary)">{bssid.frequency}</span></span>
                                <span>Channel: <span className="font-bold text-(--accent)">{bssid.channel}</span></span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : wifiNetworks.status === "loading" ? (
              <div className="flex flex-col items-center justify-center py-16 border rounded-2xl bg-black/10 border-(--border-subtle)">
                <RefreshCw className="h-8 w-8 text-(--accent) animate-spin mb-4" />
                <div className="text-lg font-semibold text-(--text-primary)">Scanning wireless environment...</div>
                <div className="text-xs text-(--text-muted) mt-1">Listening to beacons and scanning channels.</div>
              </div>
            ) : (
              <EmptyState
                icon={Wifi}
                title="Wi-Fi Scanner Ready"
                description="Click Scan & Refresh above to automatically sweep and map surrounding wireless networks."
              />
            )}
          </PageSection>
        </div>
      )}
    </div>
  );
}

function SummaryCard({ summary }: { summary: string }) {
  return (
    <div className="rounded-xl border bg-black/10 p-3 text-sm leading-5 text-(--text-secondary)">
      {summary}
    </div>
  );
}
