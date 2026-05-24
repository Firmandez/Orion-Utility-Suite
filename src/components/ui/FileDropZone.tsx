import { FolderOpen, Upload } from "lucide-react";
import { useDropzone, type Accept } from "react-dropzone";
import { cn, formatFileSize, truncateMiddle } from "@/lib/utils";

interface FileDropZoneProps {
  label?: string;
  hint?: string;
  files: File[];
  onFilesChange: (files: File[]) => void;
  accept?: Accept;
  multiple?: boolean;
  className?: string;
}

export function FileDropZone({
  label,
  hint,
  files,
  onFilesChange,
  accept,
  multiple = true,
  className,
}: FileDropZoneProps) {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept,
    multiple,
    onDrop: (acceptedFiles) => onFilesChange(acceptedFiles),
  });

  return (
    <div className={cn("space-y-3", className)}>
      {label ? (
        <div>
          <div className="text-sm font-semibold text-[var(--text-primary)]">{label}</div>
          {hint ? <div className="mt-1 text-xs text-[var(--text-muted)]">{hint}</div> : null}
        </div>
      ) : null}
      <div
        {...getRootProps()}
        className={cn(
          "group rounded-3xl border border-dashed bg-[var(--surface-2)] p-5 text-center transition outline-none",
          isDragActive ? "border-[var(--accent-soft)] bg-[var(--accent-surface)]" : "hover:border-[var(--accent-soft)] hover:bg-white/5",
        )}
      >
        <input {...getInputProps()} />
        <div className="mx-auto flex max-w-sm flex-col items-center gap-3">
          <div className="flex size-14 items-center justify-center rounded-2xl border border-[var(--accent-soft)] bg-[var(--accent-surface)] text-[var(--accent-strong)]">
            {isDragActive ? <Upload className="size-6" /> : <FolderOpen className="size-6" />}
          </div>
          <div>
            <div className="text-sm font-semibold text-[var(--text-primary)]">
              {isDragActive ? "Drop files to add them" : "Drop files here or click to choose"}
            </div>
            <div className="mt-1 text-xs text-[var(--text-muted)]">
              Supports drag-and-drop and file picker workflows across utilities.
            </div>
          </div>
        </div>
      </div>
      {files.length > 0 ? (
        <div className="space-y-2">
          {files.map((file) => (
            <div
              key={`${file.name}-${file.size}-${file.lastModified}`}
              className="flex items-center justify-between gap-3 rounded-2xl border bg-[var(--surface-2)] px-4 py-3"
            >
              <div className="min-w-0">
                <div className="truncate text-sm font-medium text-[var(--text-primary)]">{truncateMiddle(file.name)}</div>
                <div className="mt-1 text-xs text-[var(--text-muted)]">{file.type || "Unknown type"}</div>
              </div>
              <div className="shrink-0 text-xs text-[var(--text-muted)]">{formatFileSize(file.size)}</div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
