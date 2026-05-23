import { CircleDashed, RefreshCw, Sparkles } from "lucide-react";
import { startTransition, useEffect, useRef, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { EmptyState } from "@/components/common/EmptyState";
import { PageSection } from "@/components/common/PageSection";
import { ResultCard } from "@/components/common/ResultCard";
import { Button } from "@/components/ui/Button";
import { FileDropZone } from "@/components/ui/FileDropZone";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Select } from "@/components/ui/Select";
import { TextArea } from "@/components/ui/TextArea";
import { Toggle } from "@/components/ui/Toggle";
import { notify } from "@/components/ui/Toast";
import type { AppBootstrapState, SelectOption, ToolDefinition } from "@/types/app";

export interface ToolWorkspaceProps {
  feature: ToolDefinition;
  note: string;
  inputLabel: string;
  inputPlaceholder: string;
  selectLabel: string;
  selectOptions: SelectOption[];
  toggleLabel: string;
  toggleHint: string;
  actionLabel: string;
  initialInput?: string;
}

interface ToolResultState {
  generatedAt: string;
  mode: string;
  files: number;
  payloadLength: number;
  state: string;
}

export function ToolWorkspace({
  feature,
  note,
  inputLabel,
  inputPlaceholder,
  selectLabel,
  selectOptions,
  toggleLabel,
  toggleHint,
  actionLabel,
  initialInput = "",
}: ToolWorkspaceProps) {
  const bootstrap = useOutletContext<AppBootstrapState>();
  const [inputValue, setInputValue] = useState(initialInput);
  const [selectedMode, setSelectedMode] = useState(selectOptions[0]?.value ?? "");
  const [advancedEnabled, setAdvancedEnabled] = useState(true);
  const [files, setFiles] = useState<File[]>([]);
  const [progress, setProgress] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<ToolResultState | null>(null);
  const timerRef = useRef<number[]>([]);

  useEffect(() => {
    return () => {
      timerRef.current.forEach((timer) => window.clearTimeout(timer));
    };
  }, []);

  const queueTimer = (callback: () => void, delay: number) => {
    const timerId = window.setTimeout(callback, delay);
    timerRef.current.push(timerId);
  };

  const handleReset = () => {
    timerRef.current.forEach((timer) => window.clearTimeout(timer));
    timerRef.current = [];
    setInputValue(initialInput);
    setSelectedMode(selectOptions[0]?.value ?? "");
    setAdvancedEnabled(true);
    setFiles([]);
    setProgress(0);
    setIsRunning(false);
    setResult(null);
    notify.info(`${feature.title} reset`, "Form scaffold kembali ke kondisi awal.");
  };

  const handleRun = () => {
    setIsRunning(true);
    setProgress(10);
    setResult(null);
    notify.info(`${feature.title} queued`, "Simulasi progress dimulai untuk memvalidasi UX tahap 1.");

    [28, 52, 74, 93].forEach((value, index) => {
      queueTimer(() => setProgress(value), 280 * (index + 1));
    });

    queueTimer(() => {
      setProgress(100);
      setIsRunning(false);
      startTransition(() => {
        setResult({
          generatedAt: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
          mode: selectedMode || "default",
          files: files.length,
          payloadLength: inputValue.trim().length,
          state: bootstrap.source === "rust" ? "Ready for command wiring" : "Preview scaffold complete",
        });
      });
      notify.success(`${feature.title} scaffold complete`, "State, progress, toast, dan result card sudah tervalidasi.");
    }, 1580);
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
      <PageSection title={`${feature.title} Workspace`} description={note}>
        <div className="space-y-5">
          <TextArea
            label={inputLabel}
            hint="Field ini sengaja fleksibel agar bisa dipakai untuk teks, path, payload, atau preset command di tahap berikutnya."
            placeholder={inputPlaceholder}
            value={inputValue}
            onChange={(event) => setInputValue(event.target.value)}
          />
          <div className="grid gap-4 lg:grid-cols-2">
            <Select
              label={selectLabel}
              hint="Preset default dapat diikat ke command Rust, file processor, atau external binary."
              options={selectOptions}
              value={selectedMode}
              onChange={(event) => setSelectedMode(event.target.value)}
            />
            <Toggle
              label={toggleLabel}
              hint={toggleHint}
              checked={advancedEnabled}
              onCheckedChange={setAdvancedEnabled}
            />
          </div>
          <FileDropZone
            label="File input"
            hint="Drag and drop sudah siap untuk pipeline lokal seperti image, PDF, hashing, atau batch processing."
            files={files}
            onFilesChange={setFiles}
          />
          <div className="flex flex-wrap gap-3">
            <Button onClick={handleRun} loading={isRunning} leadingIcon={Sparkles}>
              {actionLabel}
            </Button>
            <Button variant="outline" onClick={handleReset} leadingIcon={RefreshCw}>
              Reset scaffold
            </Button>
          </div>
        </div>
      </PageSection>

      <div className="space-y-6">
        <ResultCard
          title="Module Readiness"
          description="Informasi ini membantu memastikan setiap halaman punya fondasi yang konsisten sebelum logika Rust berat masuk."
          rows={[
            { label: "Category", value: feature.category },
            { label: "Status", value: feature.status },
            { label: "Runtime", value: bootstrap.source === "rust" ? "Tauri desktop runtime" : "Browser scaffold preview" },
            { label: "Backend", value: bootstrap.data.backendMode },
          ]}
        />

        <PageSection
          title="Execution State"
          description="Komponen progress dan result area ini bisa langsung dihubungkan ke async command Tauri agar UI tidak freeze."
        >
          <div className="space-y-4">
            <ProgressBar label="Workflow progress" value={progress} tone={advancedEnabled ? "cyan" : "amber"} />
            {result ? (
              <ResultCard
                title="Latest Result"
                rows={[
                  { label: "Completed", value: result.generatedAt, mono: true },
                  { label: "Mode", value: result.mode },
                  { label: "Files", value: String(result.files) },
                  { label: "Payload", value: `${result.payloadLength} chars` },
                  { label: "State", value: result.state },
                ]}
              />
            ) : (
              <EmptyState
                icon={CircleDashed}
                title="Belum ada hasil proses"
                description="Jalankan scaffold ini untuk melihat alur progress, toast, dan result card sebelum logic utilitas sebenarnya ditambahkan."
              />
            )}
          </div>
        </PageSection>
      </div>
    </div>
  );
}
