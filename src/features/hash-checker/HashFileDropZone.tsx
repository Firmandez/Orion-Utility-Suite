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
        "rounded-[28px] border border-dashed bg-[var(--surface-2)] p-6 transition",
        isDragActive ? "border-[var(--accent-soft)] bg-[var(--accent-surface)]" : "hover:border-[var(--accent-soft)] hover:bg-white/5",
        disabled && "opacity-70",
      )}
    >
      <div className="mx-auto flex max-w-xl flex-col items-center gap-4 text-center">
        <div className="flex size-16 items-center justify-center rounded-3xl border border-[var(--accent-soft)] bg-[var(--accent-surface)] text-[var(--accent-strong)]">
          {isDragActive ? <Upload className="size-7" /> : <HardDriveDownload className="size-7" />}
        </div>
        <div>
          <div className="text-lg font-semibold text-[var(--text-primary)]">
            {isDragActive ? "Lepaskan file untuk memilih target hashing" : "Drop file di mana saja pada window ini"}
          </div>
          <div className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
            Orion membaca path file native dari Tauri desktop, lalu Rust menghitung MD5, SHA1,
            dan SHA256 secara streaming agar file besar tetap aman diproses.
          </div>
        </div>

        {selectedFilePath ? (
          <div className="w-full rounded-[22px] border bg-black/10 px-4 py-4 text-left">
            <div className="flex items-center gap-3">
              <FolderOpen className="size-5 shrink-0 text-[var(--accent-strong)]" />
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-[var(--text-primary)]">
                  {selectedFileName ?? "Selected file"}
                </div>
                <div className="mt-1 text-xs text-[var(--text-muted)]">{truncateMiddle(selectedFilePath, 34, 22)}</div>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-[22px] border bg-black/10 px-4 py-4 text-sm leading-6 text-[var(--text-secondary)]">
            Belum ada file yang dipilih. Anda bisa drag-and-drop langsung ke window ini atau gunakan file picker manual.
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
