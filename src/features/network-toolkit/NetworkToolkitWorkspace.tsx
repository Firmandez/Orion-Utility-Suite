import {
  Activity,
  ClipboardCopy,
  Globe2,
  LocateFixed,
  Radar,
  RefreshCw,
  Server,
  ShieldAlert,
} from "lucide-react";
import { useOutletContext } from "react-router-dom";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorBanner } from "@/components/common/ErrorBanner";
import { PageSection } from "@/components/common/PageSection";
import { ResultCard } from "@/components/common/ResultCard";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { TextArea } from "@/components/ui/TextArea";
import type { AppBootstrapState } from "@/types/app";
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
  } = useNetworkToolkit(bootstrap);

  return (
    <div className="space-y-5">
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
                      <div key={address} className="rounded-xl border bg-black/10 px-3 py-2.5 font-mono text-sm text-[var(--text-primary)]">
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
  );
}

function SummaryCard({ summary }: { summary: string }) {
  return (
    <div className="rounded-xl border bg-black/10 p-3 text-sm leading-5 text-[var(--text-secondary)]">
      {summary}
    </div>
  );
}
