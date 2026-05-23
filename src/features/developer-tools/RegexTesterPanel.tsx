import { Braces, CheckCircle2, CircleAlert, ClipboardCopy, Eraser } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { TextArea } from "@/components/ui/TextArea";
import { notify } from "@/components/ui/Toast";
import { copyText } from "@/lib/clipboard";
import { DeveloperToolCard } from "./DeveloperToolCard";
import { testRegexPattern } from "./developer-tools.utils";

interface RegexTesterPanelProps {
  className?: string;
}

const defaultPattern = "\\b(?:TODO|FIXME)\\b";
const defaultSampleText = "TODO review desktop icons\nFIXME stabilize queue ordering";

export function RegexTesterPanel({ className }: RegexTesterPanelProps) {
  const [pattern, setPattern] = useState(defaultPattern);
  const [flags, setFlags] = useState("g");
  const [sampleText, setSampleText] = useState(defaultSampleText);
  const result = testRegexPattern(pattern, flags, sampleText);

  const handleCopy = async () => {
    if (result.state !== "ready" || !result.copyValue) {
      notify.error("Tidak ada hasil", "Regex harus valid sebelum hasilnya bisa disalin.");
      return;
    }

    try {
      await copyText(result.copyValue);
      notify.success("Regex result copied", "Detail matches berhasil disalin ke clipboard.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Clipboard tidak tersedia.";
      notify.error("Copy gagal", message);
    }
  };

  const handleClear = () => {
    setPattern("");
    setFlags("");
    setSampleText("");
    notify.info("Regex cleared", "Pattern, flags, dan sample text dibersihkan.");
  };

  return (
    <DeveloperToolCard
      title="Regex Tester"
      description="Uji pattern JavaScript regex, flags, dan sample text untuk melihat match yang ditemukan secara lokal."
      icon={Braces}
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
        <div className="grid gap-4 lg:grid-cols-[1fr_180px]">
          <Input
            label="Regex pattern"
            hint="Tulis pattern tanpa pembungkus slash. Contoh: \\b(?:TODO|FIXME)\\b"
            value={pattern}
            onChange={(event) => setPattern(event.target.value)}
            placeholder="Masukkan regex pattern..."
          />
          <Input
            label="Flags"
            hint="Contoh: g, gi, m, s"
            value={flags}
            onChange={(event) => setFlags(event.target.value)}
            placeholder="g"
          />
        </div>

        <TextArea
          label="Sample text"
          hint="Paste log, source code, atau text bebas untuk diuji terhadap regex aktif."
          value={sampleText}
          onChange={(event) => setSampleText(event.target.value)}
          className="min-h-[220px] font-mono text-[13px]"
        />

        {result.state === "error" ? (
          <ToolNotice tone="error" title="Regex tidak valid" description={result.errorMessage ?? "Regex tidak bisa diproses."} />
        ) : result.state === "ready" ? (
          <>
            <ToolNotice
              tone="success"
              title="Regex ready"
              description={`${result.summary} Mode: ${result.searchMode}. Flags aktif: ${result.usedFlags}.`}
            />
            <div className="grid gap-3 md:grid-cols-3">
              <MatchStat label="Matches" value={String(result.matches.length)} />
              <MatchStat label="Flags" value={result.usedFlags ?? "(none)"} />
              <MatchStat label="Mode" value={result.searchMode ?? "-"} />
            </div>
            <div className="space-y-3">
              {result.matches.length > 0 ? (
                result.matches.map((match) => (
                  <div key={`${match.matchNumber}-${match.index}-${match.value}`} className="rounded-[22px] border bg-black/10 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="text-sm font-semibold text-[var(--text-primary)]">Match #{match.matchNumber}</div>
                      <div className="rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-[var(--text-muted)]">
                        Index {match.index}
                      </div>
                    </div>
                    <div className="mt-3 break-all rounded-2xl border bg-white/5 px-4 py-3 font-mono text-sm text-[var(--text-primary)]">
                      {match.value}
                    </div>
                    <div className="mt-3 text-xs uppercase tracking-[0.16em] text-[var(--text-muted)]">Capture groups</div>
                    <div className="mt-2 space-y-2">
                      {match.captureGroups.length > 0 ? (
                        match.captureGroups.map((group, index) => (
                          <div key={`${match.matchNumber}-group-${index}`} className="rounded-2xl border bg-white/5 px-4 py-3 font-mono text-sm text-[var(--text-secondary)]">
                            Group {index + 1}: {group}
                          </div>
                        ))
                      ) : (
                        <div className="rounded-2xl border bg-white/5 px-4 py-3 text-sm text-[var(--text-secondary)]">
                          Tidak ada capture group pada match ini.
                        </div>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-[22px] border bg-white/5 p-4 text-sm leading-6 text-[var(--text-secondary)]">
                  Regex valid, tetapi belum menemukan match pada sample text aktif.
                </div>
              )}
            </div>
          </>
        ) : (
          <ToolNotice tone="idle" title="Menunggu pattern" description="Isi pattern dan sample text untuk mulai menguji regex." />
        )}
      </div>
    </DeveloperToolCard>
  );
}

function MatchStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[20px] border bg-white/5 p-4">
      <div className="text-xs uppercase tracking-[0.16em] text-[var(--text-muted)]">{label}</div>
      <div className="mt-3 break-words text-sm font-semibold text-[var(--text-primary)]">{value}</div>
    </div>
  );
}

function ToolNotice({
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
