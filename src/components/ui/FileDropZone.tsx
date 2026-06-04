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
    <div className={cn("space-y-2", className)}>
      {label ? (
        <div>
          <div className="text-[12px] font-semibold text-(--text-primary)">{label}</div>
          {hint ? <div className="mt-0.5 text-[11px] leading-4 text-(--text-muted)">{hint}</div> : null}
        </div>
      ) : null}
      <div
        {...getRootProps()}
        className={cn(
          "group rounded-lg border border-dashed bg-(--surface-2) p-3 text-center transition outline-none",
          isDragActive ? "border-(--accent-soft) bg-(--accent-surface)" : "hover:border-(--accent-soft) hover:bg-white/5",
        )}
      >
        <input {...getInputProps()} />
        <div className="mx-auto flex max-w-sm flex-col items-center gap-2">
          <div className="flex size-9 items-center justify-center rounded-lg border border-(--accent-soft) bg-(--accent-surface) text-(--accent-strong)">
            {isDragActive ? <Upload className="size-4" /> : <FolderOpen className="size-4" />}
          </div>
          <div>
            <div className="text-sm font-semibold text-(--text-primary)">
              {isDragActive ? "Drop files to add them" : "Drop files here or click to choose"}
            </div>
            <div className="mt-0.5 text-xs text-(--text-muted)">Drag-and-drop or file picker.</div>
          </div>
        </div>
      </div>
      {files.length > 0 ? (
        <div className="space-y-1.5">
          {files.map((file) => (
            <div
              key={`${file.name}-${file.size}-${file.lastModified}`}
              className="flex items-center justify-between gap-3 rounded-lg border bg-(--surface-2) px-2.5 py-2"
            >
              <div className="min-w-0">
                <div className="truncate text-sm font-medium text-(--text-primary)">{truncateMiddle(file.name)}</div>
                <div className="mt-0.5 text-xs text-(--text-muted)">{file.type || "Unknown type"}</div>
              </div>
              <div className="shrink-0 text-xs text-(--text-muted)">{formatFileSize(file.size)}</div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
