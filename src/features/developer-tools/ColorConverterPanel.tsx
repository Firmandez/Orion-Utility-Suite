import { CheckCircle2, CircleAlert, ClipboardCopy, Eraser, Palette } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { notify } from "@/components/ui/Toast";
import { copyText } from "@/lib/clipboard";
import { DeveloperToolCard } from "./DeveloperToolCard";
import { convertColorValue } from "./developer-tools.utils";

interface ColorConverterPanelProps {
  className?: string;
}

export function ColorConverterPanel({ className }: ColorConverterPanelProps) {
  const [inputValue, setInputValue] = useState("#0EA5E9");
  const result = convertColorValue(inputValue);

  const handleCopy = async () => {
    if (result.state !== "ready" || !result.copyValue) {
      notify.error("Tidak ada hasil", "Masukkan warna valid sebelum menyalin hasil konversi.");
      return;
    }

    try {
      await copyText(result.copyValue);
      notify.success("Color copied", "Hasil konversi HEX, RGB, dan HSL berhasil disalin.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Clipboard tidak tersedia.";
      notify.error("Copy gagal", message);
    }
  };

  const handleClear = () => {
    setInputValue("");
    notify.info("Color input cleared", "Input warna dan hasil konversinya dibersihkan.");
  };

  return (
    <DeveloperToolCard
      title="Color Converter"
      description="Konversi warna antara HEX, RGB, dan HSL dengan validasi input yang ketat dan swatch preview."
      icon={Palette}
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
        <Input
          label="Color input"
          hint="Contoh: #0ea5e9, rgb(14, 165, 233), atau hsl(199, 89%, 48%)"
          value={inputValue}
          onChange={(event) => setInputValue(event.target.value)}
          placeholder="Masukkan HEX, RGB, atau HSL..."
        />

        {result.state === "error" ? (
          <ColorNotice tone="error" title="Format warna tidak valid" description={result.errorMessage ?? "Color input tidak dikenali."} />
        ) : result.state === "ready" ? (
          <>
            <ColorNotice
              tone="success"
              title="Color ready"
              description={`Input dikenali sebagai ${result.inputFormat} dan sudah dikonversi ke format lain.`}
            />
            <div className="grid gap-4 xl:grid-cols-[220px_1fr]">
              <div
                className="min-h-[220px] rounded-[28px] border shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
                style={{
                  background: `linear-gradient(160deg, ${result.swatch} 0%, rgba(255,255,255,0.12) 100%)`,
                }}
              />
              <div className="grid gap-3">
                <ColorMetric label="Detected format" value={result.inputFormat ?? "-"} />
                <ColorMetric label="HEX" value={result.hex ?? "-"} />
                <ColorMetric label="RGB" value={result.rgb ?? "-"} />
                <ColorMetric label="HSL" value={result.hsl ?? "-"} />
              </div>
            </div>
          </>
        ) : (
          <ColorNotice tone="idle" title="Menunggu warna" description="Masukkan warna dalam format HEX, RGB, atau HSL untuk melihat hasil konversi." />
        )}
      </div>
    </DeveloperToolCard>
  );
}

function ColorMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[20px] border bg-black/10 p-4">
      <div className="text-xs uppercase tracking-[0.16em] text-[var(--text-muted)]">{label}</div>
      <div className="mt-3 break-words font-mono text-sm text-[var(--text-primary)]">{value}</div>
    </div>
  );
}

function ColorNotice({
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
