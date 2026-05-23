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
    compareStatus === "match" ? "Match" : compareStatus === "not-match" ? "Not Match" : "Awaiting compare";

  return (
    <div className="surface-panel-alt p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">{label}</div>
          <div
            className={cn(
              "mt-3 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.16em]",
              compareStatus === "match"
                ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-300"
                : compareStatus === "not-match"
                  ? "border-rose-400/20 bg-rose-500/10 text-rose-300"
                  : "border-[var(--border-subtle)] bg-white/5 text-[var(--text-muted)]",
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
      <div className="mt-5 rounded-[22px] border bg-black/10 p-4">
        <div className="break-all font-mono text-[13px] leading-7 text-[var(--text-primary)]">
          {value || "Belum ada digest. Pilih file lalu jalankan hash generator."}
        </div>
      </div>
    </div>
  );
}
