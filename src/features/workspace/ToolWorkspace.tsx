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
    notify.info(`${feature.title} reset`, "The form has been restored to its initial state.");
  };

  const handleRun = () => {
    setIsRunning(true);
    setProgress(10);
    setResult(null);
    notify.info(`${feature.title} queued`, "Progress has started.");

    [28, 52, 74, 93].forEach((value, index) => {
      queueTimer(() => setProgress(value), 280 * (index + 1));
    });

    queueTimer(() => {
      setProgress(100);
      setIsRunning(false);
      startTransition(() => {
        setResult({
          generatedAt: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
          mode: selectedMode || "default",
          files: files.length,
          payloadLength: inputValue.trim().length,
          state: bootstrap.source === "rust" ? "Ready" : "Limited mode",
        });
      });
      notify.success(`${feature.title} finished`, "Progress and results have been updated.");
    }, 1580);
  };

  return (
    <div className="grid items-start gap-5 xl:grid-cols-[1.2fr_0.8fr]">
      <PageSection title={feature.title} description={note}>
        <div className="space-y-4">
          <TextArea
            label={inputLabel}
            hint="Use this field for text, file locations, or any input this tool needs."
            placeholder={inputPlaceholder}
            value={inputValue}
            onChange={(event) => setInputValue(event.target.value)}
          />
          <div className="grid gap-4 lg:grid-cols-2">
            <Select
              label={selectLabel}
              hint="Choose the right mode before running the process."
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
            label="Input files"
            hint="Drag and drop local files to process."
            files={files}
            onFilesChange={setFiles}
          />
          <div className="flex flex-wrap gap-3">
            <Button onClick={handleRun} loading={isRunning} leadingIcon={Sparkles}>
              {actionLabel}
            </Button>
            <Button variant="outline" onClick={handleReset} leadingIcon={RefreshCw}>
              Reset
            </Button>
          </div>
        </div>
      </PageSection>

      <div className="space-y-5">
        <ResultCard
          title="Summary"
          description="Quick information about the current tool."
          rows={[
            { label: "Category", value: feature.category },
            { label: "Status", value: feature.status },
            { label: "Version", value: bootstrap.data.version },
          ]}
        />

        <PageSection
          title="Progress"
          description="Track progress and the latest result."
        >
          <div className="space-y-4">
            <ProgressBar label="Progress workflow" value={progress} tone={advancedEnabled ? "cyan" : "amber"} />
            {result ? (
              <ResultCard
                title="Latest Result"
                rows={[
                  { label: "Completed", value: result.generatedAt, mono: true },
                  { label: "Mode", value: result.mode },
                  { label: "Files", value: String(result.files) },
                  { label: "Input length", value: `${result.payloadLength} characters` },
                  { label: "Status", value: result.state },
                ]}
              />
            ) : (
              <EmptyState
                icon={CircleDashed}
                title="No process results yet"
                description="Run the process to see progress and results here."
              />
            )}
          </div>
        </PageSection>
      </div>
    </div>
  );
}
