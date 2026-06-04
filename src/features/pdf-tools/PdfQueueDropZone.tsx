import { ArrowDown, ArrowUp, FileImage, Files, FolderPlus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn, truncateMiddle } from "@/lib/utils";
import type { PdfQueueItem, PdfToolOperation } from "./pdf-tools.types";
import {
  getOperationHint,
  getQueueDescription,
  isPdfOperationSingleFile,
} from "./pdf-tools.utils";

interface PdfQueueDropZoneProps {
  operation: PdfToolOperation;
  files: PdfQueueItem[];
  isDragActive: boolean;
  disabled?: boolean;
  onPick: () => void;
  onClear: () => void;
  onRemove: (path: string) => void;
  onMoveUp: (path: string) => void;
  onMoveDown: (path: string) => void;
}

export function PdfQueueDropZone({
  operation,
  files,
  isDragActive,
  disabled = false,
  onPick,
  onClear,
  onRemove,
  onMoveUp,
  onMoveDown,
}: PdfQueueDropZoneProps) {
  const Icon = operation === "image-to-pdf" ? FileImage : Files;
  const isSingle = isPdfOperationSingleFile(operation);

  return (
    <div className="space-y-2.5">
      <div
        className={cn(
          "rounded-lg border border-dashed bg-(--surface-2) p-3 transition",
          isDragActive ? "border-amber-400/55 bg-amber-500/10" : "hover:border-amber-400/28 hover:bg-white/5",
          disabled && "pointer-events-none opacity-70",
        )}
      >
        <div className="mx-auto flex max-w-2xl flex-col items-center gap-2.5 text-center">
          <div className="flex size-9 items-center justify-center rounded-lg bg-amber-500/12 text-amber-300">
            <Icon className="size-4" />
          </div>
          <div>
            <div className="text-sm font-semibold text-(--text-primary)">
              {isDragActive
                ? "Drop files to add them"
                : isSingle
                  ? "Drop one source file into this area"
                  : "Drop multiple files into this area"}
            </div>
            <div className="mt-1 text-xs leading-4 text-(--text-secondary)">
              {getQueueDescription(operation)}
            </div>
            <div className="mt-1 text-[11px] uppercase tracking-[0.08em] text-(--text-muted)">
              {getOperationHint(operation)}
            </div>
            {!isSingle ? (
              <div className="mt-1 text-xs text-(--text-muted)">Use arrows to adjust order.</div>
            ) : null}
          </div>

          <div className="flex flex-wrap justify-center gap-2">
            <Button variant="outline" leadingIcon={FolderPlus} onClick={onPick} disabled={disabled}>
              Choose files
            </Button>
            <Button variant="ghost" leadingIcon={Trash2} onClick={onClear} disabled={disabled || files.length === 0}>
              Clear queue
            </Button>
          </div>
        </div>
      </div>

      {files.length > 0 ? (
        <div className="space-y-1.5">
          {files.map((file, index) => (
            <div
              key={file.path}
              className="flex items-start justify-between gap-3 rounded-lg border bg-(--surface-2) px-3 py-2.5"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  {!isSingle ? (
                    <span className="inline-flex rounded-full border border-amber-400/18 bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-amber-200">
                      #{index + 1}
                    </span>
                  ) : null}
                  <div className="text-sm font-semibold text-(--text-primary)">{truncateMiddle(file.fileName, 26, 14)}</div>
                </div>
                <div className="mt-1 break-all font-mono text-[12px] leading-5 text-(--text-muted)">
                  {truncateMiddle(file.path, 36, 18)}
                </div>
                <div className="mt-1.5 inline-flex rounded-full border border-amber-400/18 bg-amber-500/10 px-2.5 py-0.5 text-[11px] uppercase tracking-[0.08em] text-amber-200">
                  {file.extension.toUpperCase()}
                </div>
              </div>

              <div className="flex shrink-0 items-start gap-2">
                {!isSingle ? (
                  <div className="flex flex-col gap-2">
                    <button
                      type="button"
                    aria-label={`Move ${file.fileName} up`}
                      onClick={() => onMoveUp(file.path)}
                      disabled={disabled || index === 0}
                    className="inline-flex size-8 items-center justify-center rounded-lg border bg-black/10 text-(--text-secondary) transition hover:border-amber-400/30 hover:text-amber-200 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <ArrowUp className="size-4" />
                    </button>
                    <button
                      type="button"
                    aria-label={`Move ${file.fileName} down`}
                      onClick={() => onMoveDown(file.path)}
                      disabled={disabled || index === files.length - 1}
                      className="inline-flex size-8 items-center justify-center rounded-lg border bg-black/10 text-(--text-secondary) transition hover:border-amber-400/30 hover:text-amber-200 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <ArrowDown className="size-4" />
                    </button>
                  </div>
                ) : null}

                <button
                  type="button"
                  aria-label={`Remove ${file.fileName}`}
                  onClick={() => onRemove(file.path)}
                  disabled={disabled}
                  className="inline-flex size-8 items-center justify-center rounded-lg border bg-black/10 text-(--text-secondary) transition hover:border-rose-400/30 hover:text-rose-200 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <X className="size-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
