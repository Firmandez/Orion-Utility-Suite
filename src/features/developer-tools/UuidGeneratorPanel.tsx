import { Binary, ClipboardCopy, Eraser, RefreshCcw } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { notify } from "@/components/ui/Toast";
import { copyText } from "@/lib/clipboard";
import { DeveloperToolCard } from "./DeveloperToolCard";
import type { UuidGenerationResult } from "./developer-tools.types";
import { generateUuidValue } from "./developer-tools.utils";

interface UuidGeneratorPanelProps {
  className?: string;
}

interface UuidGeneratorState {
  value: UuidGenerationResult | null;
  errorMessage?: string;
}

function buildInitialState(): UuidGeneratorState {
  try {
    return {
      value: generateUuidValue(),
      errorMessage: undefined as string | undefined,
    };
  } catch (error) {
    return {
      value: null,
      errorMessage: error instanceof Error ? error.message : "UUID generator is not available in this runtime.",
    };
  }
}

export function UuidGeneratorPanel({ className }: UuidGeneratorPanelProps) {
  const [uuidResult, setUuidResult] = useState<UuidGeneratorState>(buildInitialState);

  const handleGenerate = () => {
    try {
      const nextValue = generateUuidValue();
      setUuidResult({
        value: nextValue,
        errorMessage: undefined,
      });
      notify.success("UUID generated", "A new identifier is ready to use.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "UUID generator could not run.";
      setUuidResult({
        value: null,
        errorMessage: message,
      });
      notify.error("Generation failed", message);
    }
  };

  const handleCopy = async () => {
    if (!uuidResult.value) {
      notify.error("No UUID", "Generate a UUID before copying the result.");
      return;
    }

    try {
      await copyText(uuidResult.value.value);
      notify.success("UUID copied", "The active UUID was copied to the clipboard.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Clipboard is not available.";
      notify.error("Copy failed", message);
    }
  };

  const handleClear = () => {
    setUuidResult({
      value: null,
      errorMessage: undefined,
    });
    notify.info("UUID cleared", "Generator output cleared from this panel.");
  };

  return (
    <DeveloperToolCard
      title="UUID Generator"
      description="Create local UUID v4 values for seeds, internal identifiers, or test data without an online connection."
      icon={Binary}
      className={className}
      actions={
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" leadingIcon={RefreshCcw} onClick={handleGenerate}>
            Generate
          </Button>
          <Button variant="secondary" size="sm" leadingIcon={ClipboardCopy} onClick={handleCopy} disabled={!uuidResult.value}>
            Copy result
          </Button>
          <Button variant="ghost" size="sm" leadingIcon={Eraser} onClick={handleClear}>
            Clear
          </Button>
        </div>
      }
    >
      {uuidResult.errorMessage ? (
        <div className="rounded-2xl border border-rose-400/18 bg-rose-500/10 p-4 text-sm leading-6 text-rose-100/90">
          {uuidResult.errorMessage}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-2xl border bg-black/10 p-4">
            <div className="text-xs uppercase tracking-[0.1em] text-[var(--text-muted)]">Active UUID</div>
            <div className="mt-4 break-all font-mono text-lg text-[var(--text-primary)]">
              {uuidResult.value?.value ?? "No UUID has been generated yet."}
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-[20px] border bg-white/5 p-4">
              <div className="text-xs uppercase tracking-[0.1em] text-[var(--text-muted)]">Version</div>
              <div className="mt-3 text-sm font-semibold text-[var(--text-primary)]">UUID v4</div>
            </div>
            <div className="rounded-[20px] border bg-white/5 p-4">
              <div className="text-xs uppercase tracking-[0.1em] text-[var(--text-muted)]">Source</div>
              <div className="mt-3 text-sm font-semibold text-[var(--text-primary)]">
                {uuidResult.value?.source === "randomUUID" ? "crypto.randomUUID()" : uuidResult.value?.source === "getRandomValues" ? "crypto.getRandomValues()" : "Unavailable"}
              </div>
            </div>
          </div>
        </div>
      )}
    </DeveloperToolCard>
  );
}
