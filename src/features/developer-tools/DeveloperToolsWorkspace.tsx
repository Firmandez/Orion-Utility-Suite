import { Binary, Clock3, Palette, ShieldAlert, Sparkles, TerminalSquare } from "lucide-react";
import { useOutletContext } from "react-router-dom";
import type { AppBootstrapState } from "@/types/app";
import { ColorConverterPanel } from "./ColorConverterPanel";
import { JwtDecoderPanel } from "./JwtDecoderPanel";
import { RegexTesterPanel } from "./RegexTesterPanel";
import { TimestampConverterPanel } from "./TimestampConverterPanel";
import { UuidGeneratorPanel } from "./UuidGeneratorPanel";

const toolHighlights = [
  "UUID Generator",
  "Timestamp Converter",
  "Regex Tester",
  "JWT Decoder",
  "Color Converter",
];

export function DeveloperToolsWorkspace() {
  const bootstrap = useOutletContext<AppBootstrapState>();
  const runtimeMode = bootstrap.source === "rust" ? "Tauri Desktop" : "Browser Preview";

  return (
    <div className="space-y-6">
      <section className="surface-panel relative overflow-hidden p-6 lg:p-8">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(77,216,246,0.16),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(148,163,184,0.14),transparent_24%)]" />
        <div className="relative grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-5">
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--accent-soft)] bg-[var(--accent-surface)] px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-[var(--accent-strong)]">
              <TerminalSquare className="size-3.5" />
              Developer Playground
            </div>
            <div className="max-w-3xl">
              <h2 className="text-3xl font-semibold tracking-[-0.04em] text-[var(--text-primary)] sm:text-4xl">
                Developer Tools lokal untuk UUID, timestamp, regex, JWT, dan warna.
              </h2>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--text-secondary)] sm:text-[15px]">
                Modul ini sengaja berjalan penuh di frontend TypeScript agar ringan, instan, dan tetap
                offline-first. Semua utility dipisah per subcomponent supaya mudah dirawat dan dikembangkan.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {toolHighlights.map((toolName) => (
                <div
                  key={toolName}
                  className="rounded-full border border-[var(--border-subtle)] bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-secondary)]"
                >
                  {toolName}
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            <WorkspaceStat
              label="Active tools"
              value="5"
              caption="Utility inti untuk workflow developer sehari-hari."
              icon={Sparkles}
            />
            <WorkspaceStat
              label="Runtime"
              value={runtimeMode}
              caption="Semua transform Stage 9 berjalan lokal tanpa backend online."
              icon={ShieldAlert}
            />
            <WorkspaceStat
              label="Stack"
              value="Frontend only"
              caption="Cocok untuk payload inspection, formatting, dan quick conversions."
              icon={Binary}
            />
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <UuidGeneratorPanel />
        <TimestampConverterPanel />
        <RegexTesterPanel className="xl:col-span-2" />
        <JwtDecoderPanel />
        <ColorConverterPanel />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <MiniInfoCard
          icon={Clock3}
          title="Timestamp hints"
          description="Input numerik 10 digit dianggap Unix seconds, sementara angka lebih panjang dibaca sebagai milliseconds."
        />
        <MiniInfoCard
          icon={ShieldAlert}
          title="JWT safety"
          description="Decoder hanya membaca header dan payload. Signature tidak diverifikasi oleh utility ini."
        />
        <MiniInfoCard
          icon={Palette}
          title="Color parsing"
          description="Color converter menerima HEX, RGB, dan HSL dengan validasi range agar hasil tetap konsisten."
        />
      </div>
    </div>
  );
}

function WorkspaceStat({
  label,
  value,
  caption,
  icon: Icon,
}: {
  label: string;
  value: string;
  caption: string;
  icon: typeof Sparkles;
}) {
  return (
    <div className="surface-panel-alt p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">{label}</div>
        <div className="flex size-10 items-center justify-center rounded-2xl border border-[var(--accent-soft)] bg-[var(--accent-surface)] text-[var(--accent-strong)]">
          <Icon className="size-4" />
        </div>
      </div>
      <div className="mt-4 text-lg font-semibold text-[var(--text-primary)]">{value}</div>
      <div className="mt-2 text-xs leading-6 text-[var(--text-secondary)]">{caption}</div>
    </div>
  );
}

function MiniInfoCard({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof Sparkles;
  title: string;
  description: string;
}) {
  return (
    <div className="surface-panel-alt p-4">
      <div className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-2xl border border-[var(--accent-soft)] bg-[var(--accent-surface)] text-[var(--accent-strong)]">
          <Icon className="size-4" />
        </div>
        <div className="text-sm font-semibold text-[var(--text-primary)]">{title}</div>
      </div>
      <div className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">{description}</div>
    </div>
  );
}
