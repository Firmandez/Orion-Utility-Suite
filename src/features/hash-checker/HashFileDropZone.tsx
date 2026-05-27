import { FolderOpen, FolderX, HardDriveDownload, Upload } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn, truncateMiddle } from "@/lib/utils";

interface HashFileDropZoneProps {
  selectedFilePath?: string;
  selectedFileName?: string;
  isDragActive: boolean;
  disabled?: boolean;
  onPick: () => void;
  onClear: () => void;
}

export function HashFileDropZone({
  selectedFilePath,
  selectedFileName,
  isDragActive,
  disabled = false,
  onPick,
  onClear,
}: HashFileDropZoneProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-dashed bg-(--surface-2)] p-4 transition",
        isDragActive ? "border-(--accent-soft)] bg-(--accent-surface)]" : "hover:border-(--accent-soft)] hover:bg-white/5",
        disabled && "opacity-70",
      )}
    >
      <div className="mx-auto flex max-w-xl flex-col items-center gap-3 text-center">
        <div className="flex size-12 items-center justify-center rounded-2xl border border-(--accent-soft)] bg-(--accent-surface)] text-(--accent-strong)]">
          {isDragActive ? <Upload className="size-5" /> : <HardDriveDownload className="size-5" />}
        </div>
        <div>
          <div className="text-base font-semibold text-(--text-primary)]">
            {isDragActive ? "Drop file to select it" : "Drop a file here"}
          </div>
          <div className="mt-1.5 text-sm leading-5 text-(--text-secondary)]">
            Orion will generate MD5, SHA1, and SHA256 from your local file.
          </div>
        </div>

        {selectedFilePath ? (
          <div className="w-full rounded-xl border bg-black/10 px-3 py-3 text-left">
            <div className="flex items-center gap-3">
              <FolderOpen className="size-5 shrink-0 text-(--accent-strong)]" />
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-(--text-primary)]">
                  {selectedFileName ?? "Selected file"}
                </div>
                <div className="mt-1 text-xs text-(--text-muted)]">{truncateMiddle(selectedFilePath, 34, 22)}</div>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border bg-black/10 px-3 py-3 text-sm leading-5 text-(--text-secondary)]">
            No file selected yet. You can drag and drop a file or choose one manually.
          </div>
        )}

        <div className="flex flex-wrap justify-center gap-3">
          <Button variant="secondary" leadingIcon={FolderOpen} onClick={onPick} disabled={disabled}>
            Choose file
          </Button>
          <Button variant="ghost" leadingIcon={FolderX} onClick={onClear} disabled={!selectedFilePath || disabled}>
            Clear file
          </Button>
        </div>
      </div>
    </div>
  );
}
