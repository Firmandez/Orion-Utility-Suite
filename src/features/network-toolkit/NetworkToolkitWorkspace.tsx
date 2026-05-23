import {
  Activity,
  ClipboardCopy,
  Globe2,
  LocateFixed,
  Network,
  Radar,
  RefreshCw,
  Server,
  ShieldAlert,
} from "lucide-react";
import { useOutletContext } from "react-router-dom";
import { EmptyState } from "@/components/common/EmptyState";
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
    <div className="space-y-6">
      <section className="surface-panel relative overflow-hidden p-6 lg:p-8">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.16),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(34,211,238,0.12),transparent_24%)]" />
        <div className="relative grid gap-6 xl:grid-cols-[1.16fr_0.84fr]">
          <div className="space-y-5">
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--accent-soft)] bg-[var(--accent-surface)] px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-[var(--accent-strong)]">
              <Network className="size-3.5" />
              Local Diagnostics
            </div>
            <div className="max-w-3xl">
              <h2 className="text-3xl font-semibold tracking-[-0.04em] text-[var(--text-primary)] sm:text-4xl">
                Network Toolkit untuk lookup, reachability check, dan HTTP status secara lokal.
              </h2>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--text-secondary)] sm:text-[15px]">
                Stage 7 fokus pada tool yang paling sering dipakai: local IP, DNS lookup, ping host,
                port checker, dan HTTP status checker. Semua operasi backend berjalan di Rust dengan
                validasi input, timeout, dan hasil yang mudah dibaca.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <StatCard
                label="Local IP"
                value={localIp.data?.localIp ?? (localIp.status === "loading" ? "Loading..." : "Unavailable")}
                caption="Diambil dari backend Rust agar konsisten dengan runtime desktop."
              />
              <StatCard
                label="Runtime"
                value={isDesktopRuntime ? "Tauri Desktop" : "Browser Preview"}
                caption="Lookup aktif penuh saat Orion berjalan sebagai aplikasi desktop."
              />
              <StatCard
                label="Tool count"
                value="5 checks"
                caption="Local IP, DNS, ping, port, dan HTTP status tersedia di satu workspace."
              />
            </div>
          </div>

          <div className="surface-panel-alt p-5 sm:p-6">
            <div className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">Execution Notes</div>
            <div className="mt-4 space-y-3">
              <InfoItem
                title="Safe host validation"
                description="Host dan URL divalidasi di backend sebelum dipakai untuk DNS, TCP connect, atau command ping sistem."
              />
              <InfoItem
                title="Timeout aware"
                description="Setiap check punya timeout eksplisit agar UI tidak terasa menggantung saat host lambat atau tidak tersedia."
              />
              <InfoItem
                title="Readable output"
                description="Hasil dibuat ringkas untuk inspeksi cepat, lalu tetap bisa dicopy penuh ke clipboard bila diperlukan."
              />
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <PageSection
          title="Local IP"
          description="Menampilkan alamat IP lokal yang terdeteksi oleh runtime desktop saat ini."
          actions={
            <div className="flex gap-3">
              <Button
                variant="outline"
                size="sm"
                leadingIcon={ClipboardCopy}
                onClick={() => copyDiagnostic("local IP", localIp.data?.localIp ?? "")}
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
            <ErrorBanner title="Local IP gagal diambil" message={localIp.errorMessage} />
          ) : localIp.data ? (
            <ResultCard
              title="Network Interface Summary"
              rows={formatLocalIpRows(localIp.data)}
            />
          ) : (
            <EmptyState
              icon={LocateFixed}
              title={localIp.status === "loading" ? "Mengambil local IP..." : "Local IP belum tersedia"}
              description={
                localIp.status === "loading"
                  ? "Orion sedang meminta local IP dari backend Rust."
                  : "Jalankan Orion lewat Tauri desktop atau klik refresh untuk memuat ulang local IP."
              }
            />
          )}
        </PageSection>

        <PageSection
          title="DNS Lookup"
          description="Lookup A/AAAA record untuk domain atau host tertentu menggunakan Hickory resolver."
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
          <div className="space-y-5">
            <Input
              label="Domain or host"
              hint="Contoh: example.com, openai.com, localhost, atau IP address."
              value={dnsDomain}
              onChange={(event) => setDnsDomain(event.target.value)}
            />
            <Button leadingIcon={Globe2} onClick={runDnsLookup} loading={dns.status === "loading"} disabled={!isDesktopRuntime}>
              Run DNS lookup
            </Button>

            {dns.errorMessage ? <ErrorBanner title="DNS lookup gagal" message={dns.errorMessage} /> : null}

            {dns.data ? (
              <ResultCard
                title="DNS Result"
                rows={formatDnsRows(dns.data)}
                footer={
                  <div className="space-y-2">
                    {dns.data.addresses.map((address) => (
                      <div key={address} className="rounded-2xl border bg-black/10 px-4 py-3 font-mono text-sm text-[var(--text-primary)]">
                        {address}
                      </div>
                    ))}
                  </div>
                }
              />
            ) : dns.status === "loading" ? (
              <EmptyState
                icon={Radar}
                title="Menjalankan DNS lookup..."
                description="Resolver sedang memeriksa alamat IP untuk domain yang Anda masukkan."
              />
            ) : (
              <EmptyState
                icon={Globe2}
                title="Belum ada hasil DNS"
                description="Masukkan domain lalu jalankan lookup untuk melihat alamat IP yang ditemukan."
              />
            )}
          </div>
        </PageSection>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <PageSection
          title="Ping Host"
          description="Reachability check lintas platform menggunakan command system `ping` dengan timeout aman."
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
          <div className="space-y-5">
            <Input
              label="Host"
              hint="Contoh: example.com, 1.1.1.1, localhost."
              value={pingHost}
              onChange={(event) => setPingHost(event.target.value)}
            />
            <Button leadingIcon={Activity} onClick={runPingHost} loading={ping.status === "loading"} disabled={!isDesktopRuntime}>
              Run ping
            </Button>

            {ping.errorMessage ? <ErrorBanner title="Ping gagal" message={ping.errorMessage} /> : null}

            {ping.data ? (
              <div className="space-y-4">
                <ResultCard title="Ping Summary" rows={formatPingRows(ping.data)} />
                <TextArea
                  label="Ping output"
                  hint={ping.data.summary}
                  value={ping.data.output || "No stdout returned by the system ping command."}
                  readOnly
                  className="min-h-[220px] font-mono text-[13px]"
                />
              </div>
            ) : ping.status === "loading" ? (
              <EmptyState
                icon={Activity}
                title="Menjalankan ping..."
                description="Orion sedang memanggil utilitas ping sistem untuk mengecek reachability target."
              />
            ) : (
              <EmptyState
                icon={Activity}
                title="Belum ada hasil ping"
                description="Masukkan host lalu jalankan ping untuk melihat reachability dan output mentahnya."
              />
            )}
          </div>
        </PageSection>

        <PageSection
          title="Port Checker"
          description="Cek apakah port TCP tertentu bisa diakses dengan connect timeout ringan."
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
          <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-[1fr_140px]">
              <Input
                label="Host"
                hint="Contoh: example.com atau localhost."
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

            {port.errorMessage ? <ErrorBanner title="Port check gagal" message={port.errorMessage} /> : null}

            {port.data ? (
              <ResultCard title="Port Check Result" rows={formatPortRows(port.data)} footer={<SummaryCard summary={port.data.summary} />} />
            ) : port.status === "loading" ? (
              <EmptyState
                icon={Server}
                title="Memeriksa port..."
                description="Orion sedang mencoba membuka koneksi TCP ke host dan port yang Anda pilih."
              />
            ) : (
              <EmptyState
                icon={Server}
                title="Belum ada hasil port check"
                description="Masukkan host dan port, lalu jalankan check untuk melihat apakah port tersebut terbuka."
              />
            )}
          </div>
        </PageSection>
      </div>

      <PageSection
        title="HTTP Status Checker"
        description="Cek status HTTP/HTTPS dari URL tertentu menggunakan reqwest dengan connect timeout dan request timeout."
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
        <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <div className="space-y-5">
            <Input
              label="URL"
              hint="Contoh: https://example.com atau cukup example.com untuk auto-https."
              value={httpUrl}
              onChange={(event) => setHttpUrl(event.target.value)}
            />
            <Button leadingIcon={ShieldAlert} onClick={runHttpStatusCheck} loading={http.status === "loading"} disabled={!isDesktopRuntime}>
              Check HTTP status
            </Button>

            {http.errorMessage ? <ErrorBanner title="HTTP status gagal" message={http.errorMessage} /> : null}
          </div>

          <div>
            {http.data ? (
              <ResultCard title="HTTP Result" rows={formatHttpRows(http.data)} footer={<SummaryCard summary={http.data.summary} />} />
            ) : http.status === "loading" ? (
              <EmptyState
                icon={ShieldAlert}
                title="Mengirim request HTTP..."
                description="Orion sedang meminta header/status dari URL target menggunakan reqwest."
              />
            ) : (
              <EmptyState
                icon={ShieldAlert}
                title="Belum ada hasil HTTP"
                description="Masukkan URL lalu jalankan check untuk melihat status code, final URL, dan ringkasannya."
              />
            )}
          </div>
        </div>
      </PageSection>
    </div>
  );
}

function StatCard({
  label,
  value,
  caption,
}: {
  label: string;
  value: string;
  caption: string;
}) {
  return (
    <div className="surface-panel-alt p-4">
      <div className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">{label}</div>
      <div className="mt-3 text-lg font-semibold text-[var(--text-primary)]">{value}</div>
      <div className="mt-2 text-xs leading-6 text-[var(--text-secondary)]">{caption}</div>
    </div>
  );
}

function InfoItem({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-[22px] border bg-black/10 p-4">
      <div className="text-sm font-semibold text-[var(--text-primary)]">{title}</div>
      <div className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{description}</div>
    </div>
  );
}

function ErrorBanner({ title, message }: { title: string; message: string }) {
  return (
    <div className="rounded-[24px] border border-rose-400/18 bg-rose-500/10 p-4">
      <div className="flex items-start gap-3">
        <ShieldAlert className="mt-0.5 size-5 shrink-0 text-rose-300" />
        <div>
          <div className="text-sm font-semibold text-[var(--text-primary)]">{title}</div>
          <div className="mt-1 text-sm leading-6 text-rose-100/90">{message}</div>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ summary }: { summary: string }) {
  return (
    <div className="rounded-[22px] border bg-black/10 p-4 text-sm leading-6 text-[var(--text-secondary)]">
      {summary}
    </div>
  );
}
