import { CheckCircle2, ClipboardCopy, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

interface HashDigestCardProps {
  label: string;
  value?: string;
  compareStatus: "idle" | "match" | "not-match";
  onCopy: () => void;
}

export function HashDigestCard({ label, value, compareStatus, onCopy }: HashDigestCardProps) {
  const statusLabel =
    compareStatus === "match" ? "Match" : compareStatus === "not-match" ? "No match" : "Waiting for reference";

  return (
    <div className="surface-panel-alt p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-widest text-(--text-muted)">{label}</div>
          <div
            className={cn(
            "mt-2 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-widest",
              compareStatus === "match"
                ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-300"
                : compareStatus === "not-match"
                  ? "border-rose-400/20 bg-rose-500/10 text-rose-300"
                  : "border-(--border-subtle) bg-white/5 text-(--text-muted)",
            )}
          >
            {compareStatus === "match" ? <CheckCircle2 className="size-3.5" /> : compareStatus === "not-match" ? <ShieldAlert className="size-3.5" /> : null}
            {statusLabel}
          </div>
        </div>
        <Button variant="outline" size="sm" leadingIcon={ClipboardCopy} onClick={onCopy} disabled={!value}>
          Copy
        </Button>
      </div>
      <div className="mt-3 rounded-lg border bg-black/10 p-2.5">
        <div className="break-all font-mono text-[12px] leading-5 text-(--text-primary)">
          {value || "No digest yet."}
        </div>
      </div>
    </div>
  );
}
