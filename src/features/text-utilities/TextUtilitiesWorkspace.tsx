import {
  ArrowLeftRight,
  CheckCircle2,
  ClipboardCopy,
  Eraser,
  FileJson2,
  Hash,
  Link2,
  ScanText,
  Sparkles,
  TextCursorInput,
} from "lucide-react";
import { startTransition, useDeferredValue, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { PageSection } from "@/components/common/PageSection";
import { ResultCard } from "@/components/common/ResultCard";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { TextArea } from "@/components/ui/TextArea";
import { notify } from "@/components/ui/Toast";
import { cn } from "@/lib/utils";
import type { AppBootstrapState } from "@/types/app";
import type { TextUtilityCategory, TextUtilityOperationId } from "./text-utilities.types";
import {
  copyText,
  defaultTextUtilityOperation,
  getTextUtilityOperation,
  groupTextUtilityOperations,
  textUtilityOperationOptions,
  transformText,
} from "./text-utilities.utils";

const categoryIconMap: Record<TextUtilityCategory, typeof FileJson2> = {
  JSON: FileJson2,
  Encoding: Link2,
  "Text Transform": Sparkles,
  Metrics: Hash,
};

export function TextUtilitiesWorkspace() {
  const bootstrap = useOutletContext<AppBootstrapState>();
  const [inputValue, setInputValue] = useState('{\n  "app": "Orion Utility Suite",\n  "mode": "offline-first"\n}');
  const [operationId, setOperationId] = useState<TextUtilityOperationId>(defaultTextUtilityOperation);
  const deferredInputValue = useDeferredValue(inputValue);
  const operationGroups = groupTextUtilityOperations();
  const activeOperation = getTextUtilityOperation(operationId);
  const transformResult = transformText(deferredInputValue, operationId);
  const canCopy = Boolean(transformResult.output) && !transformResult.errorMessage;
  const canSwap = Boolean(activeOperation.swapTo) && canCopy;

  const handleCopy = async () => {
    if (!canCopy) {
      notify.error("Tidak ada hasil", "Hasil transform belum tersedia atau input masih invalid.");
      return;
    }

    try {
      await copyText(transformResult.output);
      notify.success("Result copied", `${activeOperation.outputLabel} berhasil disalin ke clipboard.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Clipboard tidak tersedia.";
      notify.error("Copy gagal", message);
    }
  };

  const handleClear = () => {
    setInputValue("");
    notify.info("Input cleared", "Panel input dibersihkan dan output ikut direset.");
  };

  const handleSwap = () => {
    if (!activeOperation.swapTo || !canCopy) {
      notify.error("Swap tidak tersedia", "Operation ini tidak punya pasangan encode/decode yang relevan.");
      return;
    }

    startTransition(() => {
      setInputValue(transformResult.output);
      setOperationId(activeOperation.swapTo as TextUtilityOperationId);
    });
    notify.success("Input swapped", "Hasil dipindah ke panel input dan direction transform dibalik.");
  };

  const handleUseResultAsInput = () => {
    if (!canCopy) {
      notify.error("Tidak ada hasil", "Belum ada output valid yang bisa dipakai ulang.");
      return;
    }

    startTransition(() => {
      setInputValue(transformResult.output);
    });
    notify.success("Result applied", "Output aktif sekarang dipakai sebagai input baru.");
  };

  return (
    <div className="space-y-6">
      <section className="surface-panel relative overflow-hidden p-6 lg:p-8">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(77,216,246,0.16),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(139,92,246,0.12),transparent_24%)]" />
        <div className="relative grid gap-6 xl:grid-cols-[1.18fr_0.82fr]">
          <div className="space-y-5">
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--accent-soft)] bg-[var(--accent-surface)] px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-[var(--accent-strong)]">
              <ScanText className="size-3.5" />
              Offline Text Lab
            </div>
            <div className="max-w-3xl">
              <h2 className="text-3xl font-semibold tracking-[-0.04em] text-[var(--text-primary)] sm:text-4xl">
                Format, encode, decode, dan rapikan teks dengan cepat.
              </h2>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--text-secondary)] sm:text-[15px]">
                Cocok untuk JSON, Base64, URL tools, text cleanup, slug, dan counter tanpa koneksi online.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <StatCard
                label="Operation"
                value={activeOperation.label}
                caption="Transform aktif yang sedang dipakai di panel output."
              />
              <StatCard
                label="Status"
                value={transformResult.errorMessage ? "Needs fix" : transformResult.statusLabel}
                caption={transformResult.errorMessage ? "Input perlu diperbaiki sebelum hasil bisa dipakai." : "Output sinkron secara realtime."}
              />
              <StatCard
                label="Status aplikasi"
                value={bootstrap.source === "rust" ? "Siap digunakan" : "Mode terbatas"}
                caption="Perubahan teks diproses langsung di perangkat Anda."
              />
            </div>
          </div>

          <div className="surface-panel-alt p-5 sm:p-6">
            <div className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">Operation Library</div>
            <div className="mt-4 space-y-4">
              {Object.entries(operationGroups).map(([category, operations]) => {
                const Icon = categoryIconMap[category as TextUtilityCategory];

                return (
                  <div key={category}>
                    <div className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-[var(--text-muted)]">
                      <Icon className="size-3.5" />
                      {category}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {operations.map((operation) => (
                        <button
                          key={operation.id}
                          type="button"
                          aria-pressed={operation.id === operationId}
                          onClick={() => {
                            startTransition(() => setOperationId(operation.id));
                          }}
                          className={cn(
                            "rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] transition",
                            operation.id === operationId
                              ? "border-[var(--accent-soft)] bg-[var(--accent-surface)] text-[var(--accent-strong)]"
                              : "border-[var(--border-subtle)] bg-white/5 text-[var(--text-secondary)] hover:border-[var(--accent-soft)] hover:text-[var(--text-primary)]",
                          )}
                        >
                          {operation.label}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <PageSection
          title="Input Panel"
          description="Tempel teks atau JSON, lalu pilih operasi yang ingin dijalankan."
          actions={
            <div className="w-full min-w-[220px] sm:w-[280px]">
              <Select
                options={textUtilityOperationOptions}
                value={operationId}
                onChange={(event) => setOperationId(event.target.value as TextUtilityOperationId)}
              />
            </div>
          }
        >
          <div className="space-y-5">
            <TextArea
              label="Source input"
              hint={activeOperation.description}
              placeholder="Tempel teks, JSON, Base64, query string, atau kalimat..."
              value={inputValue}
              onChange={(event) => setInputValue(event.target.value)}
              className="min-h-[420px]"
            />

            <div className="flex flex-wrap gap-3">
              <Button variant="outline" leadingIcon={ClipboardCopy} onClick={handleCopy} disabled={!canCopy}>
                Copy result
              </Button>
              <Button variant="secondary" leadingIcon={ArrowLeftRight} onClick={handleSwap} disabled={!canSwap}>
                Swap
              </Button>
              <Button variant="ghost" leadingIcon={TextCursorInput} onClick={handleUseResultAsInput} disabled={!canCopy}>
                Use result as input
              </Button>
              <Button variant="ghost" leadingIcon={Eraser} onClick={handleClear}>
                Clear
              </Button>
            </div>
          </div>
        </PageSection>

        <PageSection
          title="Output Panel"
          description="Hasil ditampilkan di sini dan siap disalin."
        >
          <div className="space-y-5">
            {transformResult.errorMessage ? (
              <div className="rounded-[24px] border border-rose-400/18 bg-rose-500/10 p-4">
                <div className="flex items-start gap-3">
                  <FileJson2 className="mt-0.5 size-5 shrink-0 text-rose-300" />
                  <div>
                    <div className="text-sm font-semibold text-[var(--text-primary)]">Transform gagal diproses</div>
                    <div className="mt-1 text-sm leading-6 text-rose-100/90">{transformResult.errorMessage}</div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-[24px] border border-emerald-400/18 bg-emerald-500/10 p-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-300" />
                  <div>
                    <div className="text-sm font-semibold text-[var(--text-primary)]">{activeOperation.label} ready</div>
                    <div className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">
                      {transformResult.statusLabel} secara lokal, siap disalin atau dipakai ulang sebagai input baru.
                    </div>
                  </div>
                </div>
              </div>
            )}

            <TextArea
              label={activeOperation.outputLabel}
              hint="Panel ini readonly agar hasil transform tidak berubah tanpa sengaja."
              value={
                transformResult.errorMessage
                  ? ""
                  : transformResult.output || "Belum ada hasil. Mulai dengan mengisi panel input atau pilih operation lain."
              }
              readOnly
              className="min-h-[420px] font-mono text-[13px]"
            />
          </div>
        </PageSection>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <ResultCard
          title="Transform Details"
          description="Ringkasan operasi aktif dan hasilnya."
          rows={[
            { label: "Operation", value: activeOperation.label },
            { label: "Category", value: activeOperation.category },
            { label: "Status", value: transformResult.errorMessage ? "Invalid input" : transformResult.statusLabel },
            ...transformResult.detailRows,
          ]}
        />

        <ResultCard
          title="Input vs Output Metrics"
          description="Counter ini selalu sinkron dengan panel input dan hasil operation yang aktif."
          rows={[
            { label: "Input chars", value: String(transformResult.summary.inputCharacters), mono: true },
            { label: "Input words", value: String(transformResult.summary.inputWords), mono: true },
            { label: "Output chars", value: String(transformResult.summary.outputCharacters), mono: true },
            { label: "Output words", value: String(transformResult.summary.outputWords), mono: true },
          ]}
          footer={
            <div className="grid gap-3 sm:grid-cols-2">
              <MiniInfoCard
                title="JSON & Encoding"
                description="Formatter, minifier, validator, Base64, dan URL encode/decode semuanya memakai error handling lokal."
              />
              <MiniInfoCard
                title="Text Cleanup"
                description="Uppercase, lowercase, title case, spacing cleanup, slug generator, dan counter siap dipakai cepat."
              />
            </div>
          }
        />
      </div>
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

function MiniInfoCard({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-[22px] border bg-black/10 p-4">
      <div className="text-sm font-semibold text-[var(--text-primary)]">{title}</div>
      <div className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{description}</div>
    </div>
  );
}
