import { CheckCircle2, CircleAlert, ClipboardCopy, Clock3, Eraser, RefreshCcw } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { notify } from "@/components/ui/Toast";
import { copyText } from "@/lib/clipboard";
import { DeveloperToolCard } from "./DeveloperToolCard";
import { convertTimestampInput, getCurrentTimestampPreset } from "./developer-tools.utils";

interface TimestampConverterPanelProps {
  className?: string;
}

export function TimestampConverterPanel({ className }: TimestampConverterPanelProps) {
  const [inputValue, setInputValue] = useState(getCurrentTimestampPreset);
  const result = convertTimestampInput(inputValue);

  const handleUseNow = () => {
    setInputValue(getCurrentTimestampPreset());
    notify.success("Timestamp updated", "Input diisi dengan waktu saat ini dalam Unix milliseconds.");
  };

  const handleCopy = async () => {
    if (result.state !== "ready" || !result.copyValue) {
      notify.error("Tidak ada hasil", "Masukkan timestamp valid dulu sebelum menyalin hasil.");
      return;
    }

    try {
      await copyText(result.copyValue);
      notify.success("Timestamp copied", "Semua format waktu berhasil disalin ke clipboard.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Clipboard tidak tersedia.";
      notify.error("Copy gagal", message);
    }
  };

  const handleClear = () => {
    setInputValue("");
    notify.info("Timestamp cleared", "Input timestamp dan hasil konversi dibersihkan.");
  };

  return (
    <DeveloperToolCard
      title="Timestamp Converter"
      description="Ubah Unix timestamp atau date string menjadi format lokal, UTC, ISO, detik, dan milidetik."
      icon={Clock3}
      className={className}
      actions={
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" leadingIcon={RefreshCcw} onClick={handleUseNow}>
            Use now
          </Button>
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
          label="Timestamp or date string"
          hint="Contoh: 1716449923000, 1716449923, atau 2026-05-23T08:00:00Z"
          placeholder="Masukkan Unix seconds, milliseconds, atau ISO date string..."
          value={inputValue}
          onChange={(event) => setInputValue(event.target.value)}
        />

        {result.state === "error" ? (
          <StatusNotice
            tone="error"
            title="Format timestamp tidak valid"
            description={result.errorMessage ?? "Timestamp tidak bisa diproses."}
          />
        ) : result.state === "ready" ? (
          <>
            <StatusNotice
              tone="success"
              title="Timestamp siap dipakai"
              description={`Input terdeteksi sebagai ${result.sourceLabel} dan sudah dikonversi ke beberapa format waktu.`}
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <MetricCard label="Detected input" value={result.sourceLabel ?? "-"} mono={false} />
              <MetricCard label="Unix seconds" value={result.unixSeconds ?? "-"} />
              <MetricCard label="Unix milliseconds" value={result.unixMilliseconds ?? "-"} />
              <MetricCard label="ISO 8601" value={result.isoString ?? "-"} mono={false} />
              <MetricCard label="UTC" value={result.utcTime ?? "-"} mono={false} />
              <MetricCard label="Local time" value={result.localTime ?? "-"} mono={false} />
            </div>
          </>
        ) : (
          <StatusNotice
            tone="idle"
            title="Menunggu input"
            description="Tempel timestamp atau date string untuk melihat hasil konversi secara instan."
          />
        )}
      </div>
    </DeveloperToolCard>
  );
}

function MetricCard({
  label,
  value,
  mono = true,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="rounded-[20px] border bg-black/10 p-4">
      <div className="text-xs uppercase tracking-[0.16em] text-[var(--text-muted)]">{label}</div>
      <div className={`mt-3 break-words text-sm text-[var(--text-primary)] ${mono ? "font-mono" : ""}`}>{value}</div>
    </div>
  );
}

function StatusNotice({
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
