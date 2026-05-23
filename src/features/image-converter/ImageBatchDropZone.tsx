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
    <div className="space-y-4">
      <div
        className={cn(
          "rounded-[28px] border border-dashed bg-[var(--surface-2)] p-6 transition",
          isDragActive ? "border-emerald-400/55 bg-emerald-500/10" : "hover:border-emerald-400/30 hover:bg-white/5",
          disabled && "pointer-events-none opacity-70",
        )}
      >
        <div className="mx-auto flex max-w-2xl flex-col items-center gap-4 text-center">
          <div className="flex size-16 items-center justify-center rounded-3xl bg-emerald-500/12 text-emerald-300">
            <ImageUp className="size-7" />
          </div>
          <div>
            <div className="text-base font-semibold text-[var(--text-primary)]">
              {isDragActive ? "Lepaskan gambar untuk menambahkannya ke queue" : "Drop banyak gambar sekaligus ke area ini"}
            </div>
            <div className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
              Mendukung `PNG`, `JPG`, `JPEG`, dan `WEBP` melalui drag and drop native Tauri atau file picker manual.
            </div>
          </div>
          <div className="flex flex-wrap justify-center gap-3">
            <Button variant="outline" leadingIcon={FolderPlus} onClick={onPick} disabled={disabled}>
              Pick images
            </Button>
            <Button variant="ghost" leadingIcon={Trash2} onClick={onClear} disabled={disabled || files.length === 0}>
              Clear queue
            </Button>
          </div>
        </div>
      </div>

      {files.length > 0 ? (
        <div className="space-y-3">
          {files.map((file) => (
            <div
              key={file.path}
              className="flex items-start justify-between gap-4 rounded-[24px] border bg-[var(--surface-2)] px-4 py-4"
            >
              <div className="min-w-0">
                <div className="text-sm font-semibold text-[var(--text-primary)]">{truncateMiddle(file.fileName, 26, 14)}</div>
                <div className="mt-1 break-all font-mono text-[12px] leading-6 text-[var(--text-muted)]">
                  {truncateMiddle(file.path, 36, 18)}
                </div>
                <div className="mt-2 inline-flex rounded-full border border-emerald-400/18 bg-emerald-500/10 px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-emerald-200">
                  {file.extension.toUpperCase()}
                </div>
              </div>

              <button
                type="button"
                aria-label={`Remove ${file.fileName}`}
                onClick={() => onRemove(file.path)}
                disabled={disabled}
                className="inline-flex size-10 shrink-0 items-center justify-center rounded-2xl border bg-black/10 text-[var(--text-secondary)] transition hover:border-rose-400/30 hover:text-rose-200 disabled:cursor-not-allowed disabled:opacity-60"
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
