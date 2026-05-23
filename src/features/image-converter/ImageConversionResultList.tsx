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
        title="Belum ada hasil conversion"
        description="Jalankan batch conversion untuk melihat status sukses/gagal per file beserta output path yang dihasilkan."
      />
    );
  }

  return (
    <div className="space-y-3">
      {results.map((result) => {
        const isSuccess = result.status === "success";

        return (
          <div key={`${result.inputPath}-${result.outputPath ?? result.status}`} className="rounded-[24px] border bg-[var(--surface-2)] p-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="text-sm font-semibold text-[var(--text-primary)]">
                    {truncateMiddle(result.inputPath.split(/[/\\]/).pop() || result.inputPath, 28, 18)}
                  </div>
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em]",
                      isSuccess
                        ? "border border-emerald-400/18 bg-emerald-500/10 text-emerald-200"
                        : "border border-rose-400/18 bg-rose-500/10 text-rose-200",
                    )}
                  >
                    {isSuccess ? <CheckCircle2 className="size-3.5" /> : <TriangleAlert className="size-3.5" />}
                    {isSuccess ? "Success" : "Failed"}
                  </span>
                </div>

                <div className="mt-3 space-y-2 text-sm leading-6">
                  <div>
                    <div className="text-[11px] uppercase tracking-[0.16em] text-[var(--text-muted)]">Input path</div>
                    <div className="break-all font-mono text-[13px] text-[var(--text-secondary)]">{result.inputPath}</div>
                  </div>

                  {result.outputPath ? (
                    <div>
                      <div className="text-[11px] uppercase tracking-[0.16em] text-[var(--text-muted)]">Output path</div>
                      <div className="break-all font-mono text-[13px] text-[var(--text-primary)]">{result.outputPath}</div>
                    </div>
                  ) : null}

                  {result.errorMessage ? (
                    <div>
                      <div className="text-[11px] uppercase tracking-[0.16em] text-[var(--text-muted)]">Error</div>
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
