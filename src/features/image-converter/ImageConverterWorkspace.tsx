import {
  FolderOutput,
  FolderSearch2,
  Gauge,
  ImageUp,
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
import { Toggle } from "@/components/ui/Toggle";
import type { AppBootstrapState } from "@/types/app";
import { ImageBatchDropZone } from "./ImageBatchDropZone";
import { ImageConversionResultList } from "./ImageConversionResultList";
import { imageOutputFormatOptions } from "./image-converter.utils";
import { useImageConverter } from "./useImageConverter";

export function ImageConverterWorkspace() {
  const bootstrap = useOutletContext<AppBootstrapState>();
  const { defaultOutputFolder } = useShell();
  const {
    files,
    outputFolderPath,
    outputFolderSource,
    outputFormat,
    qualityInput,
    resizeEnabled,
    resizeWidth,
    resizeHeight,
    compress,
    status,
    progressPercent,
    progressStatus,
    currentFileName,
    isWindowDragActive,
    response,
    errorMessage,
    isDesktopRuntime,
    outputModeDescription,
    pickImages,
    pickOutputFolder,
    removeFile,
    clearQueue,
    updateOutputFormat,
    updateQualityInput,
    normalizeQualityInput,
    updateResizeEnabled,
    updateResizeWidth,
    updateResizeHeight,
    updateCompress,
    copyOutputPath,
    runConversion,
  } = useImageConverter(bootstrap, defaultOutputFolder);

  const summaryRows = response
    ? [
        { label: "Output folder", value: outputFolderPath ?? response.outputFolderPath },
        { label: "Total files", value: String(response.totalFiles), mono: true },
        { label: "Success", value: String(response.successCount), mono: true },
        { label: "Failed", value: String(response.failedCount), mono: true },
      ]
    : [
        { label: "Queue size", value: String(files.length), mono: true },
        { label: "Target format", value: outputFormat.toUpperCase() },
        { label: "Resize", value: resizeEnabled ? "Enabled" : "Disabled" },
        { label: "Compress", value: compress ? "Enabled" : "Disabled" },
      ];

  return (
    <div className="space-y-6">
      <section className="surface-panel relative overflow-hidden p-6 lg:p-8">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(52,211,153,0.18),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(34,197,94,0.12),transparent_22%)]" />
        <div className="relative grid gap-6 xl:grid-cols-[1.14fr_0.86fr]">
          <div className="space-y-5">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-emerald-300">
              <ImageUp className="size-3.5" />
              Rust Batch Converter
            </div>
            <div className="max-w-3xl">
              <h2 className="text-3xl font-semibold tracking-[-0.04em] text-[var(--text-primary)] sm:text-4xl">
                Image Converter untuk batch format switch, resize, dan output folder lokal.
              </h2>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--text-secondary)] sm:text-[15px]">
                PNG, JPG, JPEG, dan WEBP diproses lewat command Rust async berbasis crate `image`,
                lengkap dengan queue multi-file, progress batch, validasi extension, dan hasil per-file
                yang tidak gagal total saat satu item bermasalah.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <StatCard
                label="Queue"
                value={`${files.length} file`}
                caption="Tambahkan banyak gambar dengan drag and drop native atau picker manual."
              />
              <StatCard
                label="Output"
                value={outputFormat.toUpperCase()}
                caption="Target format aktif untuk batch conversion saat ini."
              />
              <StatCard
                label="Batch status"
                value={status === "loading" ? "Running" : status === "ready" ? "Ready" : status === "error" ? "Needs review" : "Idle"}
                caption={progressStatus}
              />
            </div>
          </div>

          <div className="surface-panel-alt p-5 sm:p-6">
            <div className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">Execution Notes</div>
            <div className="mt-4 space-y-3">
              <InfoItem
                title="Native desktop paths"
                description="Queue memakai path file asli dari Tauri, jadi backend Rust bisa membaca dan menulis file secara aman."
              />
              <InfoItem
                title="Per-file fault tolerance"
                description="Satu file gagal tidak menghentikan batch. Orion tetap melanjutkan item berikutnya dan merangkum error di akhir."
              />
              <InfoItem
                title="Format-aware output"
                description={outputModeDescription}
              />
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <PageSection
          title="Image Queue"
          description="Susun batch source image dari file lokal. Queue ini mendukung penambahan bertahap agar Anda bisa mencampur beberapa folder sekaligus."
        >
          <ImageBatchDropZone
            files={files}
            isDragActive={isWindowDragActive}
            disabled={status === "loading"}
            onPick={pickImages}
            onClear={clearQueue}
            onRemove={removeFile}
          />
        </PageSection>

        <PageSection
          title="Conversion Settings"
          description="Atur output folder, target format, kualitas encode, resize opsional, dan compression sebelum menjalankan batch."
          actions={
            <Button variant="outline" leadingIcon={FolderSearch2} onClick={pickOutputFolder} disabled={!isDesktopRuntime || status === "loading"}>
              {outputFolderSource === "default" ? "Pick custom folder" : "Pick output folder"}
            </Button>
          }
        >
          <div className="space-y-4">
            <Input
              label="Output folder"
              hint={
                outputFolderSource === "default"
                  ? "Saat ini Orion memakai default output folder dari Settings. Pilih folder baru jika ingin override khusus batch ini."
                  : "Folder ini dipakai untuk menyimpan semua file hasil conversion tanpa hardcode path absolut di source code."
              }
              placeholder="Pilih output folder target..."
              value={outputFolderPath ?? ""}
              readOnly
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <Select
                label="Target format"
                hint="Saat ini fokus pada output PNG dan JPG agar sesuai cakupan Tahap 6."
                options={imageOutputFormatOptions}
                value={outputFormat}
                onChange={(event) => updateOutputFormat(event.target.value as "jpg" | "png")}
              />
              <Input
                label="JPG quality"
                hint="Angka 1-100. Hanya dipakai saat target format adalah JPG."
                inputMode="numeric"
                value={qualityInput}
                onChange={(event) => updateQualityInput(event.target.value)}
                onBlur={normalizeQualityInput}
                disabled={outputFormat !== "jpg"}
              />
            </div>

            <Toggle
              label="Enable resize"
              hint="Aktifkan jika Anda ingin membatasi width atau height hasil output sambil menjaga rasio gambar."
              checked={resizeEnabled}
              onCheckedChange={updateResizeEnabled}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Resize width"
                hint="Kosongkan jika hanya ingin mengontrol tinggi."
                inputMode="numeric"
                placeholder="Contoh: 1600"
                value={resizeWidth}
                onChange={(event) => updateResizeWidth(event.target.value)}
                disabled={!resizeEnabled}
              />
              <Input
                label="Resize height"
                hint="Kosongkan jika hanya ingin mengontrol lebar."
                inputMode="numeric"
                placeholder="Contoh: 1200"
                value={resizeHeight}
                onChange={(event) => updateResizeHeight(event.target.value)}
                disabled={!resizeEnabled}
              />
            </div>

            <Toggle
              label="Enable compression"
              hint="Untuk PNG, toggle ini memilih compression yang lebih agresif. Untuk JPG, ukuran file lebih banyak dipengaruhi quality."
              checked={compress}
              onCheckedChange={updateCompress}
            />

            <div className="flex flex-wrap gap-3">
              <Button
                leadingIcon={Sparkles}
                onClick={runConversion}
                loading={status === "loading"}
                disabled={!isDesktopRuntime}
              >
                Run batch conversion
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

      <div className="grid gap-6 xl:grid-cols-[0.96fr_1.04fr]">
        <PageSection
          title="Progress & Runtime"
          description="Progress batch diambil dari event backend Rust. UI tetap responsif selama decode, resize, dan encode berjalan di thread blocking terpisah."
        >
          <div className="space-y-5">
            <ProgressBar
              label={currentFileName ? `${progressStatus} - ${currentFileName}` : progressStatus}
              value={progressPercent}
              tone={status === "error" ? "amber" : "teal"}
            />

            {errorMessage ? (
              <div className="rounded-[24px] border border-rose-400/18 bg-rose-500/10 p-4">
                <div className="flex items-start gap-3">
                  <TriangleAlert className="mt-0.5 size-5 shrink-0 text-rose-300" />
                  <div>
                    <div className="text-sm font-semibold text-[var(--text-primary)]">Conversion needs review</div>
                    <div className="mt-1 text-sm leading-6 text-rose-100/90">{errorMessage}</div>
                  </div>
                </div>
              </div>
            ) : null}

            {response ? (
              <ResultCard
                title="Batch Summary"
                description="Ringkasan hasil conversion terakhir. Semua path bersifat lokal dan diproduksi oleh backend Rust."
                rows={summaryRows}
              />
            ) : (
              <EmptyState
                icon={Gauge}
                title="Belum ada batch yang dijalankan"
                description="Atur queue dan output folder lebih dulu, lalu jalankan conversion untuk melihat progress dan ringkasan hasil."
              />
            )}
          </div>
        </PageSection>

        <ResultCard
          title="Current Configuration"
          description="Snapshot cepat dari konfigurasi aktif sebelum batch dijalankan."
          rows={[
            { label: "Runtime", value: isDesktopRuntime ? "Tauri Desktop" : "Browser Preview" },
            { label: "Queue", value: `${files.length} file`, mono: true },
            { label: "Output", value: outputFormat.toUpperCase() },
            { label: "JPG quality", value: outputFormat === "jpg" ? qualityInput : "Not used", mono: outputFormat === "jpg" },
            { label: "Resize", value: resizeEnabled ? `${resizeWidth || "auto"} x ${resizeHeight || "auto"}` : "Disabled" },
            { label: "Compression", value: compress ? "Enabled" : "Disabled" },
          ]}
          footer={
            <div className="grid gap-3 sm:grid-cols-2">
              <MiniInfoCard
                title="Input support"
                description="PNG, JPG, JPEG, dan WEBP diterima. File di luar daftar ini akan difilter sebelum dikirim ke backend."
              />
              <MiniInfoCard
                title="Async backend"
                description="Batch conversion dijalankan lewat `spawn_blocking` agar webview tetap halus walau memproses banyak gambar."
              />
            </div>
          }
        />
      </div>

      <PageSection
        title="Per-file Results"
        description="Setiap item menampilkan status sukses atau gagal secara terpisah, jadi Anda bisa meninjau file bermasalah tanpa kehilangan hasil file lain."
      >
        <ImageConversionResultList
          results={response?.results ?? []}
          onCopyOutputPath={copyOutputPath}
        />
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
