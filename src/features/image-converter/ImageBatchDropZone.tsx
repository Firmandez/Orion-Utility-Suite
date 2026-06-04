import { FolderPlus, ImageUp, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn, truncateMiddle } from "@/lib/utils";
import type { ImageQueueItem } from "./image-converter.types";

interface ImageBatchDropZoneProps {
  files: ImageQueueItem[];
  isDragActive: boolean;
  disabled?: boolean;
  onPick: () => void;
  onClear: () => void;
  onRemove: (path: string) => void;
}

export function ImageBatchDropZone({
  files,
  isDragActive,
  disabled = false,
  onPick,
  onClear,
  onRemove,
}: ImageBatchDropZoneProps) {
  return (
    <div className="space-y-2.5">
      <div
        className={cn(
          "rounded-lg border border-dashed bg-(--surface-2) p-3 transition",
          isDragActive ? "border-emerald-400/55 bg-emerald-500/10" : "hover:border-emerald-400/30 hover:bg-white/5",
          disabled && "pointer-events-none opacity-70",
        )}
      >
        <div className="mx-auto flex max-w-2xl flex-col items-center gap-2.5 text-center">
          <div className="flex size-9 items-center justify-center rounded-lg bg-emerald-500/12 text-emerald-300">
            <ImageUp className="size-4" />
          </div>
          <div>
            <div className="text-sm font-semibold text-(--text-primary)">
              {isDragActive ? "Drop images to add them" : "Drop multiple images into this area"}
            </div>
            <div className="mt-1 text-xs leading-4 text-(--text-secondary)">PNG, JPG, JPEG, and WEBP.</div>
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            <Button variant="outline" leadingIcon={FolderPlus} onClick={onPick} disabled={disabled}>
              Choose images
            </Button>
            <Button variant="ghost" leadingIcon={Trash2} onClick={onClear} disabled={disabled || files.length === 0}>
              Clear queue
            </Button>
          </div>
        </div>
      </div>

      {files.length > 0 ? (
        <div className="space-y-1.5">
          {files.map((file) => (
            <div
              key={file.path}
              className="flex items-start justify-between gap-3 rounded-lg border bg-(--surface-2) px-3 py-2.5"
            >
              <div className="min-w-0">
                <div className="text-sm font-semibold text-(--text-primary)">{truncateMiddle(file.fileName, 26, 14)}</div>
                <div className="mt-1 break-all font-mono text-[12px] leading-5 text-(--text-muted)">
                  {truncateMiddle(file.path, 36, 18)}
                </div>
                <div className="mt-1.5 inline-flex rounded-full border border-emerald-400/18 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] uppercase tracking-[0.08em] text-emerald-200">
                  {file.extension.toUpperCase()}
                </div>
              </div>

              <button
                type="button"
                aria-label={`Remove ${file.fileName}`}
                onClick={() => onRemove(file.path)}
                disabled={disabled}
                className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg border bg-black/10 text-(--text-secondary) transition hover:border-rose-400/30 hover:text-rose-200 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <X className="size-4" />
              </button>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
