import {
  ClipboardCopy,
  Files,
  FolderOutput,
  FolderSearch2,
  Gauge,
  Sparkles,
  TriangleAlert,
} from "lucide-react";
import { useOutletContext } from "react-router-dom";
import { useShell } from "@/app/providers/ShellProvider";
import { EmptyState } from "@/components/common/EmptyState";
import { PageSection } from "@/components/common/PageSection";
import { ResultCard } from "@/components/common/ResultCard";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Select } from "@/components/ui/Select";
import type { AppBootstrapState } from "@/types/app";
import { PdfQueueDropZone } from "./PdfQueueDropZone";
import { PdfResultFileList } from "./PdfResultFileList";
import type { PdfToolOperation } from "./pdf-tools.types";
import {
  buildResultRows,
  getAcceptedExtensions,
  getOperationHint,
  getOperationLabel,
  getQueueDescription,
  pdfOperationOptions,
} from "./pdf-tools.utils";
import { usePdfTools } from "./usePdfTools";

export function PdfToolsWorkspace() {
  const bootstrap = useOutletContext<AppBootstrapState>();
  const { defaultOutputFolder } = useShell();
  const {
    operation,
    files,
    outputFolderPath,
    outputFolderSource,
    outputFileName,
    outputPathPreview,
    status,
    progressPercent,
    progressStatus,
    currentItemName,
    isWindowDragActive,
    result,
    errorMessage,
    isDesktopRuntime,
    isSingleFileOperation,
    pickFiles,
    pickOutputFolder,
    setOperation,
    removeFile,
    moveFileUp,
    moveFileDown,
    clearQueue,
    setOutputFileName,
    normalizeOutputFile,
    copyPath,
    copyResultSummary,
    runOperation,
  } = usePdfTools(bootstrap, defaultOutputFolder);

  const resultRows = buildResultRows(result);
  const placeholderNote =
    result?.operation === "pdf-to-images" && result.data.status === "placeholder"
      ? result.data.note
      : undefined;

  return (
    <div className="space-y-6">
      <section className="surface-panel relative overflow-hidden p-6 lg:p-8">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(251,191,36,0.18),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(248,113,113,0.12),transparent_24%)]" />
        <div className="relative grid gap-6 xl:grid-cols-[1.12fr_0.88fr]">
          <div className="space-y-5">
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/20 bg-amber-500/10 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-amber-300">
              <Files className="size-3.5" />
              Rust Document Pipeline
            </div>
            <div className="max-w-3xl">
              <h2 className="text-3xl font-semibold tracking-[-0.04em] text-[var(--text-primary)] sm:text-4xl">
                PDF Tools untuk merge, split, dan image-to-PDF secara lokal tanpa backend online.
              </h2>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--text-secondary)] sm:text-[15px]">
                Tahap 8 mengaktifkan operasi PDF dasar di Rust dengan fokus pada merge, split, dan
                image-to-PDF yang aman untuk file lokal. PDF to Image disiapkan sebagai placeholder
                teknis yang rapi sampai wiring `pdfium-render` lintas platform siap dipakai.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <StatCard
                label="Operation"
                value={getOperationLabel(operation)}
                caption={getOperationHint(operation)}
              />
              <StatCard
                label="Queue"
                value={`${files.length} file`}
                caption={isSingleFileOperation ? "Mode ini memakai satu file sumber." : "Queue mendukung banyak file."}
              />
              <StatCard
                label="Status"
                value={status === "loading" ? "Running" : status === "ready" ? "Ready" : status === "error" ? "Needs review" : "Idle"}
                caption={progressStatus}
              />
            </div>
          </div>

          <div className="surface-panel-alt p-5 sm:p-6">
            <div className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">Execution Notes</div>
            <div className="mt-4 space-y-3">
              <InfoItem
                title="Corrupt-safe handling"
                description="File PDF yang corrupt atau tidak bisa diparse akan memunculkan error terkontrol dari backend Rust, bukan membuat aplikasi crash."
              />
              <InfoItem
                title="Desktop-native paths"
                description="Queue memakai path file asli dari Tauri, jadi Rust bisa memproses file secara langsung dan tetap ringan di sisi UI."
              />
              <InfoItem
                title="Future PDF to Image"
                description="Placeholder saat ini menjaga UX tetap utuh sambil menunggu integrasi binary PDFium per platform yang lebih stabil."
              />
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <PageSection
          title="Document Queue"
          description={getQueueDescription(operation)}
        >
          <PdfQueueDropZone
            operation={operation}
            files={files}
            isDragActive={isWindowDragActive}
            disabled={status === "loading"}
            onPick={pickFiles}
            onClear={clearQueue}
            onRemove={removeFile}
            onMoveUp={moveFileUp}
            onMoveDown={moveFileDown}
          />
        </PageSection>

        <PageSection
          title="Operation Settings"
          description="Pilih jenis operasi, output folder, dan nama file output bila diperlukan sebelum menjalankan pipeline PDF."
          actions={
            <Button
              variant="outline"
              leadingIcon={FolderSearch2}
              onClick={pickOutputFolder}
              disabled={!isDesktopRuntime || status === "loading"}
            >
              {outputFolderSource === "default" ? "Pick custom folder" : "Pick output folder"}
            </Button>
          }
        >
          <div className="space-y-4">
            <Select
              label="PDF operation"
              hint="Merge dan image-to-PDF membutuhkan file output tunggal. Split dan PDF to Image memakai output folder."
              options={pdfOperationOptions}
              value={operation}
              onChange={(event) => setOperation(event.target.value as PdfToolOperation)}
            />

            <Input
              label="Output folder"
              hint={
                outputFolderSource === "default"
                  ? "Saat ini Orion memakai default output folder dari Settings. Pilih folder baru bila ingin override khusus operasi ini."
                  : "Folder ini dipakai untuk file hasil merge, split, image-to-PDF, atau placeholder export image."
              }
              placeholder="Pilih folder output..."
              value={outputFolderPath ?? ""}
              readOnly
            />

            {operation === "merge" || operation === "image-to-pdf" ? (
              <Input
                label="Output file name"
                hint="Nama file akan dibersihkan dari karakter yang tidak valid dan wajib berakhiran .pdf."
                placeholder="Contoh: merged.pdf"
                value={outputFileName}
                onChange={(event) => setOutputFileName(event.target.value)}
                onBlur={normalizeOutputFile}
              />
            ) : null}

            <Input
              label="Output preview"
              hint="Preview path lokal yang akan dipakai saat command Rust dijalankan."
              value={outputPathPreview}
              readOnly
            />

            <div className="rounded-[22px] border bg-black/10 p-4 text-sm leading-6 text-[var(--text-secondary)]">
              File yang diterima untuk operasi ini:{" "}
              <span className="font-mono text-[var(--text-primary)]">{getAcceptedExtensions(operation).join(", ").toUpperCase()}</span>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button
                leadingIcon={Sparkles}
                onClick={runOperation}
                loading={status === "loading"}
                disabled={!isDesktopRuntime}
              >
                Run PDF operation
              </Button>
              <Button
                variant="secondary"
                leadingIcon={FolderOutput}
                onClick={pickOutputFolder}
                disabled={!isDesktopRuntime || status === "loading"}
              >
                Change output folder
              </Button>
            </div>
          </div>
        </PageSection>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <PageSection
          title="Progress & Summary"
          description="Progress backend Rust dikirim ke UI lewat event Tauri agar operasi file tetap terasa responsif."
        >
          <div className="space-y-5">
            <ProgressBar
              label={currentItemName ? `${progressStatus} - ${currentItemName}` : progressStatus}
              value={progressPercent}
              tone={status === "error" ? "amber" : "cyan"}
            />

            {errorMessage ? <ErrorBanner title="Operasi PDF gagal" message={errorMessage} /> : null}

            {placeholderNote ? (
              <NoticeBanner title="PDF to Image masih placeholder" message={placeholderNote} />
            ) : null}

            {resultRows.length > 0 ? (
              <ResultCard
                title="Operation Summary"
                description="Ringkasan hasil terakhir dari backend Rust untuk operasi PDF aktif."
                rows={resultRows}
                footer={
                  <Button variant="outline" leadingIcon={ClipboardCopy} onClick={copyResultSummary}>
                    Copy summary
                  </Button>
                }
              />
            ) : (
              <EmptyState
                icon={Gauge}
                title="Belum ada hasil operasi"
                description="Atur queue dan output folder lebih dulu, lalu jalankan operasi PDF untuk melihat progress serta hasilnya."
              />
            )}
          </div>
        </PageSection>

        <ResultCard
          title="Current Configuration"
          description="Snapshot cepat dari mode operasi PDF yang sedang aktif."
          rows={[
            { label: "Runtime", value: isDesktopRuntime ? "Tauri Desktop" : "Browser Preview" },
            { label: "Operation", value: getOperationLabel(operation) },
            { label: "Queue size", value: `${files.length} file`, mono: true },
            { label: "Accepted", value: getAcceptedExtensions(operation).join(", ").toUpperCase() },
            { label: "Output folder", value: outputFolderPath ?? "Not selected" },
            {
              label: "Output target",
              value:
                operation === "merge" || operation === "image-to-pdf"
                  ? outputFileName || "Not set"
                  : "Folder-based output",
            },
          ]}
          footer={
            <div className="grid gap-3 sm:grid-cols-2">
              <MiniInfoCard
                title="lopdf + printpdf"
                description="Merge dan split memakai lopdf, sedangkan image-to-PDF memakai printpdf dengan source image lokal."
              />
              <MiniInfoCard
                title="Async execution"
                description="Operasi file berjalan di worker blocking terpisah supaya webview tetap halus selama pemrosesan dokumen."
              />
            </div>
          }
        />
      </div>

      <PageSection
        title="Output Files"
        description="Hasil file ditampilkan per operasi agar mudah disalin path-nya, terutama untuk split yang menghasilkan banyak dokumen."
      >
        <PdfResultFileList result={result} onCopyPath={copyPath} />
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

function MiniInfoCard({ title, description }: { title: string; description: string }) {
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
        <TriangleAlert className="mt-0.5 size-5 shrink-0 text-rose-300" />
        <div>
          <div className="text-sm font-semibold text-[var(--text-primary)]">{title}</div>
          <div className="mt-1 text-sm leading-6 text-rose-100/90">{message}</div>
        </div>
      </div>
    </div>
  );
}

function NoticeBanner({ title, message }: { title: string; message: string }) {
  return (
    <div className="rounded-[24px] border border-amber-400/18 bg-amber-500/10 p-4">
      <div className="flex items-start gap-3">
        <TriangleAlert className="mt-0.5 size-5 shrink-0 text-amber-300" />
        <div>
          <div className="text-sm font-semibold text-[var(--text-primary)]">{title}</div>
          <div className="mt-1 text-sm leading-6 text-amber-100/90">{message}</div>
        </div>
      </div>
    </div>
  );
}
