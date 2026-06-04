import {
  ArrowLeftRight,
  CheckCircle2,
  ClipboardCopy,
  Eraser,
  FileJson2,
  Hash,
  Link2,
  Sparkles,
  TextCursorInput,
} from "lucide-react";
import { startTransition, useDeferredValue, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { PageSection } from "@/components/common/PageSection";
import { ResultCard } from "@/components/common/ResultCard";
import { Button } from "@/components/ui/Button";
import { CompactTabs, type CompactTabItem } from "@/components/ui/CompactTabs";
import { TextArea } from "@/components/ui/TextArea";
import { notify } from "@/components/ui/Toast";
import type { AppBootstrapState } from "@/types/app";
import type { TextUtilityCategory, TextUtilityOperationId } from "./text-utilities.types";
import {
  copyText,
  defaultTextUtilityOperation,
  getTextUtilityOperation,
  textUtilityOperations,
  transformText,
} from "./text-utilities.utils";

const categoryIconMap: Record<TextUtilityCategory, typeof FileJson2> = {
  JSON: FileJson2,
  Encoding: Link2,
  "Text Transform": Sparkles,
  Metrics: Hash,
};

const textUtilityTabs = textUtilityOperations.map((operation) => ({
  id: operation.id,
  label: operation.label,
  icon: categoryIconMap[operation.category],
})) satisfies CompactTabItem<TextUtilityOperationId>[];

export function TextUtilitiesWorkspace() {
  useOutletContext<AppBootstrapState>();
  const [inputValue, setInputValue] = useState('{\n  "app": "Orion Utility Suite",\n  "mode": "offline-first"\n}');
  const [operationId, setOperationId] = useState<TextUtilityOperationId>(defaultTextUtilityOperation);
  const deferredInputValue = useDeferredValue(inputValue);
  const activeOperation = getTextUtilityOperation(operationId);
  const transformResult = transformText(deferredInputValue, operationId);
  const canCopy = Boolean(transformResult.output) && !transformResult.errorMessage;
  const canSwap = Boolean(activeOperation.swapTo) && canCopy;

  const handleCopy = async () => {
    if (!canCopy) {
      notify.error("No result", "Transform result is not available or input is invalid.");
      return;
    }

    try {
      await copyText(transformResult.output);
      notify.success("Result copied", `${activeOperation.outputLabel} copied to clipboard.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Clipboard not available.";
      notify.error("Copy failed", message);
    }
  };

  const handleClear = () => {
    setInputValue("");
    notify.info("Input cleared", "Input panel cleared and output has been reset.");
  };

  const handleSwap = () => {
    if (!activeOperation.swapTo || !canCopy) {
      notify.error("Swap not available", "This operation doesn't have a matching encode/decode pair.");
      return;
    }

    startTransition(() => {
      setInputValue(transformResult.output);
      setOperationId(activeOperation.swapTo as TextUtilityOperationId);
    });
    notify.success("Input swapped", "Result moved to input panel and transform direction reversed.");
  };

  const handleUseResultAsInput = () => {
    if (!canCopy) {
      notify.error("No result", "No valid output available to reuse.");
      return;
    }

    startTransition(() => {
      setInputValue(transformResult.output);
    });
    notify.success("Result applied", "Active output is now used as new input.");
  };

  return (
    <div className="space-y-4">
      <div className="grid items-start gap-4 xl:grid-cols-[1fr_1fr]">
        <PageSection
          title="Input Panel"
          description="Paste text or JSON, then choose a transform."
        >
          <div className="space-y-3">
            <CompactTabs
              items={textUtilityTabs}
              value={operationId}
              onChange={(nextOperation) => {
                startTransition(() => setOperationId(nextOperation));
              }}
            />

            <TextArea
              label="Source input"
              hint={activeOperation.description}
              placeholder="Paste text, JSON, Base64, query string, or sentences..."
              value={inputValue}
              onChange={(event) => setInputValue(event.target.value)}
              className="min-h-[260px]"
            />

            <div className="flex flex-wrap gap-2">
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
          description="Copy-ready result output."
        >
          <div className="space-y-3">
            {transformResult.errorMessage ? (
              <div className="rounded-xl border border-rose-400/18 bg-rose-500/10 p-3">
                <div className="flex items-start gap-3">
                  <FileJson2 className="mt-0.5 size-4 shrink-0 text-rose-300" />
                  <div>
                    <div className="text-sm font-semibold text-(--text-primary)">Transform failed</div>
                    <div className="mt-1 text-xs leading-4 text-rose-100/90">{transformResult.errorMessage}</div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-emerald-400/18 bg-emerald-500/10 p-3">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-300" />
                  <div>
                    <div className="text-sm font-semibold text-(--text-primary)">{activeOperation.label} ready</div>
                    <div className="mt-1 text-xs leading-4 text-(--text-secondary)">Processed locally and ready to copy.</div>
                  </div>
                </div>
              </div>
            )}

            <TextArea
              label={activeOperation.outputLabel}
              hint="This panel is read-only so transform results aren't accidentally modified."
              value={
                transformResult.errorMessage
                  ? ""
                  : transformResult.output || "No results yet. Start by filling the input panel or choosing another operation."
              }
              readOnly
              className="min-h-[260px] font-mono text-[13px]"
            />
          </div>
        </PageSection>
      </div>

      <ResultCard
        title="Input & Output Metrics"
        description="These counters stay in sync with the input panel and active operation."
        rows={[
          { label: "Input characters", value: String(transformResult.summary.inputCharacters), mono: true },
          { label: "Input words", value: String(transformResult.summary.inputWords), mono: true },
          { label: "Output characters", value: String(transformResult.summary.outputCharacters), mono: true },
          { label: "Output words", value: String(transformResult.summary.outputWords), mono: true },
        ]}
      />
    </div>
  );
}
