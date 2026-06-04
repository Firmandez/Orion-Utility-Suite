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
        "rounded-lg border border-dashed bg-(--surface-2) p-3 transition",
        isDragActive ? "border-(--accent-soft) bg-(--accent-surface)" : "hover:border-(--accent-soft) hover:bg-white/5",
        disabled && "opacity-70",
      )}
    >
      <div className="mx-auto flex max-w-xl flex-col items-center gap-2.5 text-center">
        <div className="flex size-9 items-center justify-center rounded-lg border border-(--accent-soft) bg-(--accent-surface) text-(--accent-strong)">
          {isDragActive ? <Upload className="size-4" /> : <HardDriveDownload className="size-4" />}
        </div>
        <div>
          <div className="text-sm font-semibold text-(--text-primary)">
            {isDragActive ? "Drop file to select it" : "Drop a file here"}
          </div>
          <div className="mt-1 text-xs leading-4 text-(--text-secondary)">Generates MD5, SHA1, and SHA256 locally.</div>
        </div>

        {selectedFilePath ? (
          <div className="w-full rounded-lg border bg-black/10 px-3 py-2.5 text-left">
            <div className="flex items-center gap-3">
              <FolderOpen className="size-4 shrink-0 text-(--accent-strong)" />
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-(--text-primary)">
                  {selectedFileName ?? "Selected file"}
                </div>
                <div className="mt-0.5 text-xs text-(--text-muted)">{truncateMiddle(selectedFilePath, 34, 22)}</div>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-lg border bg-black/10 px-3 py-2 text-xs leading-4 text-(--text-secondary)">No file selected yet.</div>
        )}

        <div className="flex flex-wrap justify-center gap-2">
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
