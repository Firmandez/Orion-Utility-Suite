import { CheckCircle2, ClipboardCopy, FileOutput, TriangleAlert } from "lucide-react";
import { EmptyState } from "@/components/common/EmptyState";
import { Button } from "@/components/ui/Button";
import { cn, truncateMiddle } from "@/lib/utils";
import type { PdfOperationResult } from "./pdf-tools.types";
import { getBaseName } from "./pdf-tools.utils";

interface PdfResultFileListProps {
  result?: PdfOperationResult;
  onCopyPath: (path: string, label: string) => void;
}

export function PdfResultFileList({ result, onCopyPath }: PdfResultFileListProps) {
  if (!result) {
    return (
      <EmptyState
        icon={FileOutput}
        title="No PDF operation results yet"
        description="Run merge, split, or image to PDF to see output files and result summaries here."
      />
    );
  }

  if (result.operation === "merge" || result.operation === "image-to-pdf") {
    const outputPath = result.data.outputPath;

    return (
      <ResultPathCard
        title={getBaseName(outputPath)}
        description={outputPath}
        status="success"
        onCopy={() => onCopyPath(outputPath, "output path")}
      />
    );
  }

  if (result.operation === "split") {
    return (
      <div className="space-y-3">
        {result.data.generatedFiles.map((path) => (
          <ResultPathCard
            key={path}
            title={getBaseName(path)}
            description={path}
            status="success"
            onCopy={() => onCopyPath(path, "result file path")}
          />
        ))}
      </div>
    );
  }

  if (result.data.generatedFiles.length === 0) {
    return (
      <EmptyState
        icon={TriangleAlert}
        title="No image results yet"
        description={result.data.note ?? "The operation has not generated images yet. Check the selected output folder."}
      />
    );
  }

  return (
    <div className="space-y-3">
      {result.data.generatedFiles.map((path) => (
        <ResultPathCard
          key={path}
          title={getBaseName(path)}
          description={path}
          status="success"
          onCopy={() => onCopyPath(path, "result image path")}
        />
      ))}
    </div>
  );
}

function ResultPathCard({
  title,
  description,
  status,
  onCopy,
}: {
  title: string;
  description: string;
  status: "success" | "warning";
  onCopy: () => void;
}) {
  const isSuccess = status === "success";

  return (
    <div className="rounded-2xl border bg-(--surface-2) p-3">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <div className="text-sm font-semibold text-(--text-primary)">
              {truncateMiddle(title, 28, 18)}
            </div>
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-widest",
                isSuccess
                  ? "border border-emerald-400/18 bg-emerald-500/10 text-emerald-200"
                  : "border border-amber-400/18 bg-amber-500/10 text-amber-200",
              )}
            >
              {isSuccess ? <CheckCircle2 className="size-3.5" /> : <TriangleAlert className="size-3.5" />}
              {isSuccess ? "Ready" : "Review"}
            </span>
          </div>

          <div className="mt-3">
            <div className="text-[11px] uppercase tracking-widest text-(--text-muted)">Path</div>
            <div className="mt-1 break-all font-mono text-[13px] text-(--text-primary)">{description}</div>
          </div>
        </div>

        <div className="shrink-0">
          <Button variant="outline" leadingIcon={ClipboardCopy} onClick={onCopy}>
            Copy path
          </Button>
        </div>
      </div>
    </div>
  );
}
