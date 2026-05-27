import { CheckCircle2, CircleAlert, ClipboardCopy, Eraser, ShieldAlert } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { TextArea } from "@/components/ui/TextArea";
import { notify } from "@/components/ui/Toast";
import { copyText } from "@/lib/clipboard";
import { DeveloperToolCard } from "./DeveloperToolCard";
import { decodeJwtToken } from "./developer-tools.utils";

interface JwtDecoderPanelProps {
  className?: string;
}

export function JwtDecoderPanel({ className }: JwtDecoderPanelProps) {
  const [token, setToken] = useState("");
  const result = decodeJwtToken(token);

  const handleCopy = async () => {
    if (result.state !== "ready" || !result.copyValue) {
      notify.error("No result", "Paste a valid JWT before copying decoded results.");
      return;
    }

    try {
      await copyText(result.copyValue);
      notify.success("JWT copied", "Header and token payload copied to the clipboard.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Clipboard is not available.";
      notify.error("Copy failed", message);
    }
  };

  const handleClear = () => {
    setToken("");
    notify.info("JWT cleared", "Token input and decoded results have been cleared.");
  };

  return (
    <DeveloperToolCard
      title="JWT Decoder"
      description="Read JWT headers and payloads locally without signature verification."
      icon={ShieldAlert}
      className={className}
      actions={
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" leadingIcon={ClipboardCopy} onClick={handleCopy} disabled={result.state !== "ready"}>
            Copy result
          </Button>
          <Button variant="ghost" size="sm" leadingIcon={Eraser} onClick={handleClear}>
            Clear
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        <TextArea
          label="JWT token"
          hint="Tokens are decoded locally only. Signatures are not verified by this tool."
          placeholder="Paste JWT here..."
          value={token}
          onChange={(event) => setToken(event.target.value)}
          className="min-h-[150px] font-mono text-[13px]"
        />

        {result.state === "error" ? (
          <JwtNotice tone="error" title="Invalid JWT" description={result.errorMessage ?? "Token could not be decoded."} />
        ) : result.state === "ready" ? (
          <>
            <JwtNotice
              tone="success"
              title="JWT decoded"
              description={`Header and payload were read successfully. Token has ${result.segments} segments and signature is ${result.signaturePresent ? "present" : "missing"}.`}
            />
            <div className="grid gap-3 md:grid-cols-2">
              <StatPill label="Segments" value={String(result.segments ?? 0)} />
              <StatPill label="Signature" value={result.signaturePresent ? "Present" : "Missing"} />
            </div>
            <div className="grid gap-4 xl:grid-cols-2">
              <TextArea label="Header" value={result.headerPretty ?? ""} readOnly className="min-h-[260px] font-mono text-[13px]" />
              <TextArea label="Payload" value={result.payloadPretty ?? ""} readOnly className="min-h-[260px] font-mono text-[13px]" />
            </div>
          </>
        ) : (
          <JwtNotice
            tone="idle"
            title="Waiting for token"
            description="Paste a JWT to inspect its header and payload. This tool does not verify signatures."
          />
        )}
      </div>
    </DeveloperToolCard>
  );
}

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-white/5 p-3">
      <div className="text-xs uppercase tracking-widest text-(--text-muted)">{label}</div>
      <div className="mt-3 text-sm font-semibold text-(--text-primary)">{value}</div>
    </div>
  );
}

function JwtNotice({
  tone,
  title,
  description,
}: {
  tone: "success" | "error" | "idle";
  title: string;
  description: string;
}) {
  const Icon = tone === "success" ? CheckCircle2 : CircleAlert;
  const toneClassName =
    tone === "success"
      ? "border-emerald-400/18 bg-emerald-500/10 text-(--text-secondary)"
      : tone === "error"
        ? "border-rose-400/18 bg-rose-500/10 text-rose-100/90"
        : "border-(--border-subtle) bg-white/5 text-(--text-secondary)";

  return (
    <div className={`rounded-xl border p-3 ${toneClassName}`}>
      <div className="flex items-start gap-3">
        <Icon
          className={`mt-0.5 size-5 shrink-0 ${tone === "success" ? "text-emerald-300" : tone === "error" ? "text-rose-300" : "text-(--accent-strong)"}`}
        />
        <div>
          <div className="text-sm font-semibold text-(--text-primary)">{title}</div>
          <div className="mt-1 text-sm leading-5">{description}</div>
        </div>
      </div>
    </div>
  );
}
