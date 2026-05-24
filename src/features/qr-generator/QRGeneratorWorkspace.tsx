import {
  AlertTriangle,
  ContactRound,
  Download,
  ImagePlus,
  Link2,
  Mail,
  MessageCircleMore,
  QrCode,
  RotateCcw,
  Trash2,
  Wifi,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { EmptyState } from "@/components/common/EmptyState";
import { PageSection } from "@/components/common/PageSection";
import { Button } from "@/components/ui/Button";
import { FileDropZone } from "@/components/ui/FileDropZone";
import { Select } from "@/components/ui/Select";
import { notify } from "@/components/ui/Toast";
import { cn, formatFileSize } from "@/lib/utils";
import type { AppBootstrapState } from "@/types/app";
import { DynamicPresetFields } from "./QRGeneratorFields";
import { ColorSwatchCard, RangeField, ValidationPanel } from "./QRGeneratorPrimitives";
import type { QRFormState, QRPresetId } from "./qr-generator.types";
import { useQrCodeStyling } from "./useQrCodeStyling";
import {
  buildInitialQrFormState,
  buildQrPayload,
  clamp,
  DEFAULT_LOGO_SIZE_PERCENT,
  MAX_LOGO_SIZE_PERCENT,
  MAX_QR_SIZE,
  MIN_LOGO_SIZE_PERCENT,
  MIN_QR_SIZE,
  PREVIEW_PLACEHOLDER_DATA,
  qrErrorCorrectionOptions,
  qrPresetDefinitions,
} from "./qr-generator.utils";

const logoAccept = {
  "image/*": [".png", ".jpg", ".jpeg", ".svg", ".webp"],
};

const presetIconMap = {
  text: QrCode,
  url: Link2,
  wifi: Wifi,
  whatsapp: MessageCircleMore,
  email: Mail,
  vcard: ContactRound,
} satisfies Record<QRPresetId, typeof QrCode>;

export function QRGeneratorWorkspace() {
  useOutletContext<AppBootstrapState>();
  const [form, setForm] = useState<QRFormState>(() => buildInitialQrFormState());
  const [logoFiles, setLogoFiles] = useState<File[]>([]);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);

  const hasLogo = logoFiles.length > 0 && Boolean(logoPreviewUrl);
  const qrBuild = buildQrPayload(form, hasLogo);
  const previewPayload = qrBuild.errors.length === 0 ? qrBuild.data : PREVIEW_PLACEHOLDER_DATA;

  const { containerRef, exportQr } = useQrCodeStyling({
    data: previewPayload,
    foregroundColor: form.foregroundColor,
    backgroundColor: form.backgroundColor,
    size: form.size,
    effectiveCorrectionLevel: qrBuild.effectiveCorrectionLevel,
    logoUrl: logoPreviewUrl,
    logoSizePercent: form.logoSizePercent,
  });

  const activePreset = qrPresetDefinitions.find((preset) => preset.id === form.preset) ?? qrPresetDefinitions[0];
  const canExport = qrBuild.errors.length === 0 && qrBuild.data.length > 0;

  useEffect(() => {
    return () => {
      if (logoPreviewUrl) {
        URL.revokeObjectURL(logoPreviewUrl);
      }
    };
  }, [logoPreviewUrl]);

  const updateForm = <Key extends keyof QRFormState>(key: Key, value: QRFormState[Key]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handlePresetChange = (preset: QRPresetId) => {
    setForm((current) => ({ ...current, preset }));
  };

  const clearLogo = (withToast = true) => {
    if (logoPreviewUrl) {
      URL.revokeObjectURL(logoPreviewUrl);
    }

    setLogoFiles([]);
    setLogoPreviewUrl(null);
    setForm((current) => ({
      ...current,
      logoSizePercent: DEFAULT_LOGO_SIZE_PERCENT,
    }));

    if (withToast) {
      notify.info("Logo removed", "QR now uses the full pattern without a center logo.");
    }
  };

  const handleLogoFilesChange = (files: File[]) => {
    const nextFile = files[0];

    if (!nextFile) {
      clearLogo(false);
      return;
    }

    if (!nextFile.type.startsWith("image/")) {
      notify.error("Invalid logo", "Choose a PNG, JPG, SVG, or WEBP image file.");
      return;
    }

    if (nextFile.size > 2_500_000) {
      notify.error("Logo too large", "Use a logo under 2.5 MB for smooth preview and export.");
      return;
    }

    if (logoPreviewUrl) {
      URL.revokeObjectURL(logoPreviewUrl);
    }

    const nextUrl = URL.createObjectURL(nextFile);
    setLogoFiles([nextFile]);
    setLogoPreviewUrl(nextUrl);
    setForm((current) => ({
      ...current,
      logoSizePercent: clamp(current.logoSizePercent, MIN_LOGO_SIZE_PERCENT, MAX_LOGO_SIZE_PERCENT),
    }));
    notify.success("Logo applied", "Logo placed in QR center with scan-safe protection enabled.");
  };

  const handleExport = async (extension: "png" | "svg") => {
    if (!canExport) {
      notify.error("QR not ready", "Fix validation errors before exporting.");
      return;
    }

    try {
      await exportQr(extension, qrBuild.fileStem);
      notify.success(
        `QR ${extension.toUpperCase()} exported`,
        `QR ${activePreset.label} exported as ${extension.toUpperCase()}.`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Export could not be processed.";
      notify.error("Export failed", message);
    }
  };

  const handleReset = () => {
    clearLogo(false);
    setForm(buildInitialQrFormState());
    notify.info("QR Generator reset", "QR type, content, colors, size, and logo have been reset.");
  };

  return (
    <div className="grid gap-6 2xl:grid-cols-[1.12fr_0.88fr]">
      <div className="space-y-6">
        <PageSection
          title="QR Content"
          description="Choose a QR type and fill in the required fields. Preview updates automatically."
        >
          <div className="space-y-5">
            <div className="flex flex-wrap gap-2">
              {qrPresetDefinitions.map((preset) => {
                const Icon = presetIconMap[preset.id];
                const isActive = preset.id === form.preset;

                return (
                  <button
                    key={preset.id}
                    type="button"
                    aria-pressed={isActive}
                    onClick={() => handlePresetChange(preset.id)}
                    className={cn(
                      "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.1em] transition",
                      isActive
                        ? "border-[var(--accent-soft)] bg-[var(--accent-surface)] text-[var(--accent-strong)]"
                        : "border-[var(--border-subtle)] bg-white/5 text-[var(--text-secondary)] hover:border-[var(--accent-soft)] hover:text-[var(--text-primary)]",
                    )}
                  >
                    <Icon className="size-3.5" />
                    {preset.label}
                  </button>
                );
              })}
            </div>
            <DynamicPresetFields form={form} updateForm={updateForm} />
            <ValidationPanel errors={qrBuild.errors} warnings={qrBuild.warnings} />
          </div>
        </PageSection>

        <PageSection
          title="Style & Export"
          description="Customize colors, size, error correction, and center logo. Changes are reflected in the live preview."
          actions={
            <div className="rounded-full border border-[var(--accent-soft)] bg-[var(--accent-surface)] px-3 py-1 text-[11px] uppercase tracking-[0.1em] text-[var(--accent-strong)]">
              PNG + SVG
            </div>
          }
        >
          <div className="space-y-5">
            <div className="grid gap-4 lg:grid-cols-2">
              <ColorSwatchCard
                label="Foreground color"
                hint="Color for QR modules, finder patterns, and corner markers."
                value={form.foregroundColor}
                onChange={(value) => updateForm("foregroundColor", value)}
              />
              <ColorSwatchCard
                label="Background color"
                hint="Base canvas color. High contrast makes scanning more reliable."
                value={form.backgroundColor}
                onChange={(value) => updateForm("backgroundColor", value)}
              />
            </div>

            <div className="grid gap-4 xl:grid-cols-[1fr_1fr_0.9fr]">
              <RangeField
                label="QR size"
                hint="Export resolution matches this value."
                min={MIN_QR_SIZE}
                max={MAX_QR_SIZE}
                step={4}
                value={form.size}
                suffix="px"
                onChange={(value) => updateForm("size", value)}
              />
              <RangeField
                label="Logo size"
                hint={hasLogo ? "Clamped to a safe range so the logo doesn't cover important modules." : "Upload a logo first to adjust its scale."}
                min={MIN_LOGO_SIZE_PERCENT}
                max={MAX_LOGO_SIZE_PERCENT}
                step={1}
                value={form.logoSizePercent}
                suffix="%"
                disabled={!hasLogo}
                onChange={(value) => updateForm("logoSizePercent", value)}
              />
              <Select
                label="Scan protection"
                hint="When a logo is active, export automatically uses at least level H."
                options={qrErrorCorrectionOptions}
                value={form.errorCorrectionLevel}
                onChange={(event) => updateForm("errorCorrectionLevel", event.target.value as QRFormState["errorCorrectionLevel"])}
              />
            </div>

            <div className="grid gap-4 xl:grid-cols-[1.12fr_0.88fr]">
              <FileDropZone
                label="Center logo"
                hint="Use a simple, high-contrast logo. Formats: PNG, JPG, SVG, or WEBP."
                files={logoFiles}
                onFilesChange={handleLogoFilesChange}
                accept={logoAccept}
                multiple={false}
              />

              <div className="surface-panel-alt flex flex-col gap-4 p-5">
                <div>
                  <div className="text-sm font-semibold text-[var(--text-primary)]">Preview logo</div>
                  <div className="mt-1 text-xs leading-6 text-[var(--text-muted)]">
                   Use a simple logo with enough whitespace around it.
                  </div>
                </div>

                {logoPreviewUrl && logoFiles[0] ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-4 rounded-2xl border bg-black/10 p-4">
                      <div className="flex size-16 items-center justify-center overflow-hidden rounded-2xl border bg-white">
                        <img src={logoPreviewUrl} alt={logoFiles[0].name} className="max-h-full max-w-full object-contain" />
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-[var(--text-primary)]">{logoFiles[0].name}</div>
                        <div className="mt-1 text-xs text-[var(--text-muted)]">{formatFileSize(logoFiles[0].size)}</div>
                        <div className="mt-2 text-xs text-[var(--accent-strong)]">Rendered at {form.logoSizePercent}% of QR area</div>
                      </div>
                    </div>
                    <Button variant="outline" leadingIcon={Trash2} onClick={() => clearLogo()}>
                       Remove logo
                    </Button>
                  </div>
                ) : (
                  <EmptyState
                    icon={ImagePlus}
                    title="No logo added"
                    description="Upload a logo to create a branded QR. The system will adjust error correction to keep it scannable."
                  />
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button onClick={() => void handleExport("png")} leadingIcon={Download}>
                Export PNG
              </Button>
              <Button variant="secondary" onClick={() => void handleExport("svg")} leadingIcon={Download}>
                Export SVG
              </Button>
              <Button variant="outline" onClick={handleReset} leadingIcon={RotateCcw}>
                Reset
              </Button>
            </div>
          </div>
        </PageSection>
      </div>

      <div className="space-y-6">
        <PageSection
          title="QR Preview"
          description="Preview reflects content, colors, size, and logo settings."
        >
          <div className="space-y-4">
            <div className="surface-panel-alt relative overflow-hidden p-5">
              <div className="flex items-center justify-between gap-3">
                <div className="text-xs uppercase tracking-[0.1em] text-[var(--text-muted)]">Realtime canvas</div>
                <div className="rounded-full border border-[var(--accent-soft)] bg-[var(--accent-surface)] px-3 py-1 text-[11px] uppercase tracking-[0.1em] text-[var(--accent-strong)]">
                  {form.size}px
                </div>
              </div>
              <div className="mt-5 flex justify-center">
                <div
                  className={cn(
                    "relative flex min-h-[380px] w-full items-center justify-center rounded-3xl border bg-[linear-gradient(180deg,rgba(255,255,255,0.86),rgba(235,245,255,0.92))] p-6",
                    qrBuild.errors.length > 0 && "opacity-65",
                  )}
                >
                  <div ref={containerRef} className="flex items-center justify-center" />
                  {qrBuild.errors.length > 0 ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-[rgba(4,10,18,0.42)] p-6 backdrop-blur-[2px]">
                      <div className="max-w-sm rounded-3xl border border-amber-300/20 bg-[rgba(11,20,34,0.92)] p-5 text-center">
                        <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-amber-500/12 text-amber-300">
                          <AlertTriangle className="size-6" />
                        </div>
                        <div className="mt-4 text-lg font-semibold text-[var(--text-primary)]">Preview waiting for valid input</div>
                        <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                          Fix the highlighted fields so the QR can be generated and exported.
                        </p>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </PageSection>
      </div>
    </div>
  );
}
