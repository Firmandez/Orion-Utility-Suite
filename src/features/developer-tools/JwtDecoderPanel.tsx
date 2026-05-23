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
      notify.error("Tidak ada hasil", "Paste JWT valid terlebih dulu sebelum menyalin hasil decode.");
      return;
    }

    try {
      await copyText(result.copyValue);
      notify.success("JWT copied", "Header dan payload decoded berhasil disalin ke clipboard.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Clipboard tidak tersedia.";
      notify.error("Copy gagal", message);
    }
  };

  const handleClear = () => {
    setToken("");
    notify.info("JWT cleared", "Input token dan hasil decode dibersihkan.");
  };

  return (
    <DeveloperToolCard
      title="JWT Decoder"
      description="Decode header dan payload JWT secara lokal tanpa verifikasi signature, cocok untuk inspeksi cepat payload."
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
          hint="Token hanya di-decode lokal. Signature tidak diverifikasi oleh tool ini."
          placeholder="Paste JWT di sini..."
          value={token}
          onChange={(event) => setToken(event.target.value)}
          className="min-h-[150px] font-mono text-[13px]"
        />

        {result.state === "error" ? (
          <JwtNotice tone="error" title="JWT tidak valid" description={result.errorMessage ?? "Token tidak bisa di-decode."} />
        ) : result.state === "ready" ? (
          <>
            <JwtNotice
              tone="success"
              title="JWT decoded"
              description={`Header dan payload berhasil dibaca. Token memiliki ${result.segments} segmen dan signature ${result.signaturePresent ? "tersedia" : "tidak ada"}.`}
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
            title="Menunggu token"
            description="Paste JWT untuk melihat header dan payload. Tool ini tidak melakukan signature verification."
          />
        )}
      </div>
    </DeveloperToolCard>
  );
}

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[20px] border bg-white/5 p-4">
      <div className="text-xs uppercase tracking-[0.16em] text-[var(--text-muted)]">{label}</div>
      <div className="mt-3 text-sm font-semibold text-[var(--text-primary)]">{value}</div>
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
      ? "border-emerald-400/18 bg-emerald-500/10 text-[var(--text-secondary)]"
      : tone === "error"
        ? "border-rose-400/18 bg-rose-500/10 text-rose-100/90"
        : "border-[var(--border-subtle)] bg-white/5 text-[var(--text-secondary)]";

  return (
    <div className={`rounded-[22px] border p-4 ${toneClassName}`}>
      <div className="flex items-start gap-3">
        <Icon
          className={`mt-0.5 size-5 shrink-0 ${tone === "success" ? "text-emerald-300" : tone === "error" ? "text-rose-300" : "text-[var(--accent-strong)]"}`}
        />
        <div>
          <div className="text-sm font-semibold text-[var(--text-primary)]">{title}</div>
          <div className="mt-1 text-sm leading-6">{description}</div>
        </div>
      </div>
    </div>
  );
}
