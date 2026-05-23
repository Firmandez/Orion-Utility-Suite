import {
  FolderSearch2,
  Gauge,
  ShieldCheck,
  ShieldX,
  Sparkles,
} from "lucide-react";
import { useOutletContext } from "react-router-dom";
import { EmptyState } from "@/components/common/EmptyState";
import { PageSection } from "@/components/common/PageSection";
import { ResultCard } from "@/components/common/ResultCard";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { truncateMiddle } from "@/lib/utils";
import type { AppBootstrapState } from "@/types/app";
import { HashDigestCard } from "./HashDigestCard";
import { HashFileDropZone } from "./HashFileDropZone";
import { useHashChecker } from "./useHashChecker";
import { compareReferenceHash, describeComparison } from "./hash-checker.utils";

export function HashCheckerWorkspace() {
  const bootstrap = useOutletContext<AppBootstrapState>();
  const {
    selectedFileName,
    selectedFilePath,
    referenceHash,
    result,
    status,
    progressPercent,
    progressStatus,
    isWindowDragActive,
    errorMessage,
    isDesktopRuntime,
    pickFile,
    clearSelection,
    setReferenceHash,
    runHash,
    copyHashValue,
  } = useHashChecker(bootstrap);

  const compareState = compareReferenceHash(referenceHash, result);

  return (
    <div className="space-y-6">
      <section className="surface-panel relative overflow-hidden p-6 lg:p-8">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(77,216,246,0.16),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(251,191,36,0.12),transparent_24%)]" />
        <div className="relative grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-5">
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--accent-soft)] bg-[var(--accent-surface)] px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-[var(--accent-strong)]">
              <ShieldCheck className="size-3.5" />
              Stream Hash Engine
            </div>
            <div className="max-w-3xl">
              <h2 className="text-3xl font-semibold tracking-[-0.04em] text-[var(--text-primary)] sm:text-4xl">
                Hash Checker berbasis Rust dengan streaming digest untuk file besar.
              </h2>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--text-secondary)] sm:text-[15px]">
                File diproses per chunk di backend Rust untuk menghasilkan MD5, SHA1, dan SHA256
                tanpa memuat seluruh isi file ke memory, lengkap dengan progress event ke UI.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <StatCard
                label="Selected file"
                value={selectedFileName ?? "No file"}
                caption="Drop file ke window atau pilih manual lewat dialog native."
              />
              <StatCard
                label="Hash status"
                value={status === "loading" ? "Hashing" : status === "ready" ? "Ready" : status === "error" ? "Error" : "Idle"}
                caption={progressStatus}
              />
              <StatCard
                label="Compare state"
                value={compareState.status === "match" ? "Match" : compareState.status === "not-match" ? "Not Match" : "Standby"}
                caption={describeComparison(compareState)}
              />
            </div>
          </div>

          <div className="surface-panel-alt p-5 sm:p-6">
            <div className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">Execution Notes</div>
            <div className="mt-4 space-y-3">
              <InfoItem
                title="Rust streaming only"
                description="Hashing berjalan di backend lokal dengan pembacaan chunked agar UI tidak freeze."
              />
              <InfoItem
                title="Desktop-native path"
                description="Drag-drop memakai path file native dari Tauri, bukan blob besar di frontend."
              />
              <InfoItem
                title="Realtime progress"
                description="Backend mengirim progress berkala selama pembacaan file dan finalisasi digest."
              />
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <PageSection
          title="File Source"
          description="Pilih target file dari sistem lokal, lalu jalankan generator hash untuk mendapatkan MD5, SHA1, dan SHA256."
        >
          <div className="space-y-5">
            <HashFileDropZone
              selectedFilePath={selectedFilePath}
              selectedFileName={selectedFileName}
              isDragActive={isWindowDragActive}
              disabled={status === "loading"}
              onPick={pickFile}
              onClear={clearSelection}
            />

            <Input
              label="Reference hash"
              hint="Tempel hash pembanding untuk mengecek apakah cocok dengan salah satu digest hasil file."
              placeholder="Masukkan MD5, SHA1, atau SHA256 pembanding..."
              value={referenceHash}
              onChange={(event) => setReferenceHash(event.target.value)}
            />

            <div className="flex flex-wrap gap-3">
              <Button leadingIcon={Sparkles} onClick={runHash} loading={status === "loading"} disabled={!selectedFilePath || !isDesktopRuntime}>
                Generate hashes
              </Button>
              <Button variant="outline" leadingIcon={FolderSearch2} onClick={pickFile} disabled={status === "loading" || !isDesktopRuntime}>
                Pick another file
              </Button>
            </div>
          </div>
        </PageSection>

        <PageSection
          title="Progress & File Info"
          description="Status proses backend Rust ditampilkan di sini, termasuk file target, progress chunk reading, dan ringkasan hasil akhir."
        >
          <div className="space-y-5">
            <ProgressBar
              label={progressStatus}
              value={progressPercent}
              tone={status === "error" ? "amber" : "cyan"}
            />

            {errorMessage ? (
              <div className="rounded-[24px] border border-rose-400/18 bg-rose-500/10 p-4">
                <div className="flex items-start gap-3">
                  <ShieldX className="mt-0.5 size-5 shrink-0 text-rose-300" />
                  <div>
                    <div className="text-sm font-semibold text-[var(--text-primary)]">Hash generation failed</div>
                    <div className="mt-1 text-sm leading-6 text-rose-100/90">{errorMessage}</div>
                  </div>
                </div>
              </div>
            ) : null}

            {result ? (
              <ResultCard
                title="File Summary"
                rows={[
                  { label: "File name", value: result.fileName },
                  { label: "File size", value: `${result.fileSize.toLocaleString("id-ID")} bytes`, mono: true },
                  { label: "Selected path", value: selectedFilePath ? truncateMiddle(selectedFilePath, 24, 16) : "Unavailable" },
                  { label: "Compare", value: compareState.status === "match" ? "Match" : compareState.status === "not-match" ? "Not Match" : "Idle" },
                ]}
              />
            ) : (
              <EmptyState
                icon={Gauge}
                title="Belum ada hasil hashing"
                description="Pilih file lalu jalankan hash generator untuk melihat digest, progress, dan status pembanding."
              />
            )}
          </div>
        </PageSection>
      </div>

      <PageSection
        title="Generated Digests"
        description="Setiap digest bisa disalin secara individual dan otomatis dibandingkan dengan reference hash yang Anda masukkan."
      >
        <div className="grid gap-4 xl:grid-cols-3">
          <HashDigestCard
            label="MD5"
            value={result?.md5}
            compareStatus={compareState.status === "idle" ? "idle" : compareState.matches.md5 ? "match" : "not-match"}
            onCopy={() => copyHashValue("MD5", result?.md5)}
          />
          <HashDigestCard
            label="SHA1"
            value={result?.sha1}
            compareStatus={compareState.status === "idle" ? "idle" : compareState.matches.sha1 ? "match" : "not-match"}
            onCopy={() => copyHashValue("SHA1", result?.sha1)}
          />
          <HashDigestCard
            label="SHA256"
            value={result?.sha256}
            compareStatus={compareState.status === "idle" ? "idle" : compareState.matches.sha256 ? "match" : "not-match"}
            onCopy={() => copyHashValue("SHA256", result?.sha256)}
          />
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
