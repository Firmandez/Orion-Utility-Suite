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
      notify.error("No result", "Regex must be valid before results can be copied.");
      return;
    }

    try {
      await copyText(result.copyValue);
      notify.success("Regex results copied", "Match details copied to the clipboard.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Clipboard is not available.";
      notify.error("Copy failed", message);
    }
  };

  const handleClear = () => {
    setPattern("");
    setFlags("");
    setSampleText("");
    notify.info("Regex cleared", "Pattern, flags, and sample text have been cleared.");
  };

  return (
    <DeveloperToolCard
      title="Regex Tester"
      description="Test JavaScript regex patterns, flags, and sample text locally."
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
            hint="Write the pattern without wrapping slashes. Example: \\b(?:TODO|FIXME)\\b"
            value={pattern}
            onChange={(event) => setPattern(event.target.value)}
            placeholder="Enter a regex pattern..."
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
          hint="Paste logs, source code, or free-form text to test against the active regex."
          value={sampleText}
          onChange={(event) => setSampleText(event.target.value)}
          className="min-h-[220px] font-mono text-[13px]"
        />

        {result.state === "error" ? (
          <ToolNotice tone="error" title="Invalid regex" description={result.errorMessage ?? "Regex could not be processed."} />
        ) : result.state === "ready" ? (
          <>
            <ToolNotice
              tone="success"
              title="Regex ready"
              description={`${result.summary} Mode: ${result.searchMode}. Active flags: ${result.usedFlags}.`}
            />
            <div className="grid gap-3 md:grid-cols-3">
              <MatchStat label="Match" value={String(result.matches.length)} />
              <MatchStat label="Flags" value={result.usedFlags ?? "(none)"} />
              <MatchStat label="Mode" value={result.searchMode ?? "-"} />
            </div>
            <div className="space-y-3">
              {result.matches.length > 0 ? (
                result.matches.map((match) => (
                  <div key={`${match.matchNumber}-${match.index}-${match.value}`} className="rounded-xl border bg-black/10 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="text-sm font-semibold text-(--text-primary)">Match #{match.matchNumber}</div>
                      <div className="rounded-full border px-3 py-1 text-[11px] uppercase tracking-widest text-(--text-muted)">
                        Index {match.index}
                      </div>
                    </div>
                    <div className="mt-2.5 break-all rounded-xl border bg-white/5 px-3 py-2.5 font-mono text-sm text-(--text-primary)">
                      {match.value}
                    </div>
                    <div className="mt-3 text-xs uppercase tracking-widest text-(--text-muted)">Capture groups</div>
                    <div className="mt-2 space-y-2">
                      {match.captureGroups.length > 0 ? (
                        match.captureGroups.map((group, index) => (
                          <div key={`${match.matchNumber}-group-${index}`} className="rounded-xl border bg-white/5 px-3 py-2.5 font-mono text-sm text-(--text-secondary)">
                            Group {index + 1}: {group}
                          </div>
                        ))
                      ) : (
                        <div className="rounded-xl border bg-white/5 px-3 py-2.5 text-sm text-(--text-secondary)">
                          No capture groups in this match.
                        </div>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-xl border bg-white/5 p-3 text-sm leading-5 text-(--text-secondary)">
                  Regex is valid, but no matches were found in the active sample text.
                </div>
              )}
            </div>
          </>
        ) : (
          <ToolNotice tone="idle" title="Waiting for pattern" description="Fill in the pattern and sample text to start testing regex." />
        )}
      </div>
    </DeveloperToolCard>
  );
}

function MatchStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-white/5 p-3">
      <div className="text-xs uppercase tracking-widest text-(--text-muted)">{label}</div>
      <div className="mt-3 break-words text-sm font-semibold text-(--text-primary)">{value}</div>
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
