import { useRef, useEffect } from "react";
import { PageSection } from "@/components/common/PageSection";
import { ProgressBar } from "@/components/ui/ProgressBar";

interface DownloadProgressPanelProps {
  status: string;
  progressPercent: number;
  speed: string | null;
  eta: string | null;
  downloaded: string | null;
  total: string | null;
  message: string;
  logLines: string[];
}

export function DownloadProgressPanel({
  status,
  progressPercent,
  speed,
  eta,
  total,
  message,
  logLines,
}: DownloadProgressPanelProps) {
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [logLines.length]);

  const tone = status === "failed" ? "amber" : "cyan";
  const safePercent = Math.max(0, Math.min(100, progressPercent));

  return (
    <PageSection title="Progress & Logs" description="Download progress and yt-dlp output.">
      <div className="space-y-3">
        <ProgressBar label={message} value={safePercent} tone={tone} />

        {(speed || eta || total) && (
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-(--text-muted)">
            {speed && <span>Speed: <span className="font-mono text-(--text-secondary)">{speed}</span></span>}
            {eta && <span>ETA: <span className="font-mono text-(--text-secondary)">{eta}</span></span>}
            {total && <span>Size: <span className="font-mono text-(--text-secondary)">{total}</span></span>}
          </div>
        )}

        {logLines.length > 0 && (
          <div
            ref={logRef}
            className="max-h-36 overflow-y-auto rounded-lg border bg-black/20 p-2 font-mono text-[11px] leading-4 text-(--text-muted)"
          >
            {logLines.map((line, i) => (
              <div key={i} className="whitespace-pre-wrap break-all">
                {line}
              </div>
            ))}
          </div>
        )}
      </div>
    </PageSection>
  );
}
