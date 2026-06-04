import { CheckCircle2, ClipboardCopy, TriangleAlert } from "lucide-react";
import { EmptyState } from "@/components/common/EmptyState";
import { Button } from "@/components/ui/Button";
import { cn, truncateMiddle } from "@/lib/utils";
import type { ImageConversionFileResultResponse } from "@/types/app";

interface ImageConversionResultListProps {
  results: ImageConversionFileResultResponse[];
  onCopyOutputPath: (path?: string) => void;
}

export function ImageConversionResultList({
  results,
  onCopyOutputPath,
}: ImageConversionResultListProps) {
  if (results.length === 0) {
    return (
      <EmptyState
        icon={TriangleAlert}
        title="No conversion results yet"
        description="Run a batch conversion to see per-file results."
      />
    );
  }

  return (
    <div className="space-y-3">
      {results.map((result) => {
        const isSuccess = result.status === "success";

        return (
          <div key={`${result.inputPath}-${result.outputPath ?? result.status}`} className="rounded-lg border bg-(--surface-2) p-3">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="text-sm font-semibold text-(--text-primary)">
                    {truncateMiddle(result.inputPath.split(/[/\\]/).pop() || result.inputPath, 28, 18)}
                  </div>
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest",
                      isSuccess
                        ? "border border-emerald-400/18 bg-emerald-500/10 text-emerald-200"
                        : "border border-rose-400/18 bg-rose-500/10 text-rose-200",
                    )}
                  >
                    {isSuccess ? <CheckCircle2 className="size-3.5" /> : <TriangleAlert className="size-3.5" />}
                    {isSuccess ? "Success" : "Failed"}
                  </span>
                </div>

                <div className="mt-2 space-y-1.5 text-sm leading-5">
                  <div>
                    <div className="text-[11px] uppercase tracking-widest text-(--text-muted)">Input path</div>
                    <div className="break-all font-mono text-[12px] text-(--text-secondary)">{result.inputPath}</div>
                  </div>

                  {result.outputPath ? (
                    <div>
                      <div className="text-[11px] uppercase tracking-widest text-(--text-muted)">Output path</div>
                      <div className="break-all font-mono text-[12px] text-(--text-primary)">{result.outputPath}</div>
                    </div>
                  ) : null}

                  {result.errorMessage ? (
                    <div>
                      <div className="text-[11px] uppercase tracking-widest text-(--text-muted)">Error</div>
                      <div className="text-rose-100/90">{result.errorMessage}</div>
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="shrink-0">
                <Button
                  variant="outline"
                  leadingIcon={ClipboardCopy}
                  onClick={() => onCopyOutputPath(result.outputPath)}
                  disabled={!result.outputPath}
                >
                  Copy output path
                </Button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
