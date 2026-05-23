import {
  AlertTriangle,
  CheckCircle2,
  ContactRound,
  Download,
  ImagePlus,
  Link2,
  Mail,
  MessageCircleMore,
  Palette,
  QrCode,
  RotateCcw,
  ScanLine,
  ShieldCheck,
  Trash2,
  Wifi,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { EmptyState } from "@/components/common/EmptyState";
import { PageSection } from "@/components/common/PageSection";
import { ResultCard } from "@/components/common/ResultCard";
import { Button } from "@/components/ui/Button";
import { FileDropZone } from "@/components/ui/FileDropZone";
import { Select } from "@/components/ui/Select";
import { TextArea } from "@/components/ui/TextArea";
import { notify } from "@/components/ui/Toast";
import { cn, formatFileSize } from "@/lib/utils";
import type { AppBootstrapState } from "@/types/app";
import { DynamicPresetFields } from "./QRGeneratorFields";
import { ColorSwatchCard, RangeField, ReadinessItem, ValidationPanel } from "./QRGeneratorPrimitives";
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
  getWifiSecurityLabel,
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
  const bootstrap = useOutletContext<AppBootstrapState>();
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
      notify.info("Logo removed", "QR kembali memakai pola penuh tanpa logo di tengah.");
    }
  };

  const handleLogoFilesChange = (files: File[]) => {
    const nextFile = files[0];

    if (!nextFile) {
      clearLogo(false);
      return;
    }

    if (!nextFile.type.startsWith("image/")) {
      notify.error("Logo tidak valid", "Pilih file gambar PNG, JPG, SVG, atau WEBP.");
      return;
    }

    if (nextFile.size > 2_500_000) {
      notify.error("Logo terlalu besar", "Gunakan logo maksimal 2.5 MB agar preview dan export tetap ringan.");
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
    notify.success("Logo applied", "Logo berhasil ditempatkan di tengah QR dengan scan-safe guard aktif.");
  };

  const handleExport = async (extension: "png" | "svg") => {
    if (!canExport) {
      notify.error("QR belum siap", "Perbaiki validation error terlebih dahulu sebelum export.");
      return;
    }

    try {
      await exportQr(extension, qrBuild.fileStem);
      notify.success(
        `QR ${extension.toUpperCase()} exported`,
        `Payload ${activePreset.label} berhasil disiapkan untuk disimpan secara lokal.`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Export gagal diproses.";
      notify.error("Export gagal", message);
    }
  };

  const handleReset = () => {
    clearLogo(false);
    setForm(buildInitialQrFormState());
    notify.info("QR Generator reset", "Preset, payload, warna, ukuran, dan logo kembali ke kondisi awal.");
  };

  return (
    <div className="grid gap-6 2xl:grid-cols-[1.12fr_0.88fr]">
      <div className="space-y-6">
        <section className="surface-panel relative overflow-hidden p-6 lg:p-8">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(77,216,246,0.16),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(45,212,191,0.12),transparent_22%)]" />
          <div className="relative space-y-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-3xl">
                <div className="inline-flex items-center gap-2 rounded-full border border-[var(--accent-soft)] bg-[var(--accent-surface)] px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-[var(--accent-strong)]">
                  <ScanLine className="size-3.5" />
                  Offline QR Studio
                </div>
                <h2 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-[var(--text-primary)] sm:text-4xl">
                  QR Generator modular dengan preset, logo-safe preview, dan export lokal.
                </h2>
                <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--text-secondary)] sm:text-[15px]">
                  Preview dirender real-time dengan `qr-code-styling`, seluruh workflow tetap offline,
                  dan saat logo aktif level koreksi otomatis diamankan agar QR tetap mudah dipindai.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3 lg:w-[360px] lg:grid-cols-1">
                <StatCard
                  label="Preset aktif"
                  value={activePreset.label}
                  caption={activePreset.description}
                />
                <StatCard
                  label="Correction efektif"
                  value={qrBuild.effectiveCorrectionLevel}
                  caption={hasLogo ? "Dinaikkan ke H untuk menjaga scanability logo overlay." : "Mengikuti pilihan pengguna."}
                />
                <StatCard
                  label="Runtime"
                  value={bootstrap.source === "rust" ? "Tauri Desktop" : "Browser Preview"}
                  caption="Export diproses lokal tanpa backend online atau cloud service."
                />
              </div>
            </div>

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
                      "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] transition",
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
          </div>
        </section>

        <PageSection
          title="Payload Builder"
          description="Pilih preset yang sesuai lalu isi field yang diperlukan. Payload mentah akan dibentuk otomatis dan dipakai langsung untuk preview."
        >
          <div className="space-y-5">
            <DynamicPresetFields form={form} updateForm={updateForm} />
            <ValidationPanel errors={qrBuild.errors} warnings={qrBuild.warnings} />
          </div>
        </PageSection>

        <PageSection
          title="Style & Export"
          description="Atur warna, ukuran QR, koreksi error, dan logo tengah. Semua perubahan langsung terpantul di live preview."
          actions={
            <div className="rounded-full border border-[var(--accent-soft)] bg-[var(--accent-surface)] px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-[var(--accent-strong)]">
              PNG + SVG ready
            </div>
          }
        >
          <div className="space-y-5">
            <div className="grid gap-4 lg:grid-cols-2">
              <ColorSwatchCard
                label="Foreground color"
                hint="Warna modul QR, finder pattern, dan sudut penanda."
                value={form.foregroundColor}
                onChange={(value) => updateForm("foregroundColor", value)}
              />
              <ColorSwatchCard
                label="Background color"
                hint="Warna dasar kanvas QR. Kontras tinggi akan membantu scanning."
                value={form.backgroundColor}
                onChange={(value) => updateForm("backgroundColor", value)}
              />
            </div>

            <div className="grid gap-4 xl:grid-cols-[1fr_1fr_0.9fr]">
              <RangeField
                label="QR size"
                hint="Ukuran final output akan mengikuti nilai ini."
                min={MIN_QR_SIZE}
                max={MAX_QR_SIZE}
                step={4}
                value={form.size}
                suffix="px"
                onChange={(value) => updateForm("size", value)}
              />
              <RangeField
                label="Logo size"
                hint={hasLogo ? "Dibatasi ke rentang aman agar logo tidak menutup modul inti." : "Upload logo lebih dulu untuk menyesuaikan skalanya."}
                min={MIN_LOGO_SIZE_PERCENT}
                max={MAX_LOGO_SIZE_PERCENT}
                step={1}
                value={form.logoSizePercent}
                suffix="%"
                disabled={!hasLogo}
                onChange={(value) => updateForm("logoSizePercent", value)}
              />
              <Select
                label="Error correction"
                hint="Saat logo aktif, export tetap dipaksa minimal H."
                options={qrErrorCorrectionOptions}
                value={form.errorCorrectionLevel}
                onChange={(event) => updateForm("errorCorrectionLevel", event.target.value as QRFormState["errorCorrectionLevel"])}
              />
            </div>

            <div className="grid gap-4 xl:grid-cols-[1.12fr_0.88fr]">
              <FileDropZone
                label="Logo tengah"
                hint="Gunakan logo sederhana dan kontras. Format PNG, JPG, SVG, atau WEBP."
                files={logoFiles}
                onFilesChange={handleLogoFilesChange}
                accept={logoAccept}
                multiple={false}
              />

              <div className="surface-panel-alt flex flex-col gap-4 p-5">
                <div>
                  <div className="text-sm font-semibold text-[var(--text-primary)]">Logo preview</div>
                  <div className="mt-1 text-xs leading-6 text-[var(--text-muted)]">
                    Disarankan logo sederhana dengan area kosong yang cukup di sekelilingnya.
                  </div>
                </div>

                {logoPreviewUrl && logoFiles[0] ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-4 rounded-[22px] border bg-black/10 p-4">
                      <div className="flex size-16 items-center justify-center overflow-hidden rounded-2xl border bg-white">
                        <img src={logoPreviewUrl} alt={logoFiles[0].name} className="max-h-full max-w-full object-contain" />
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-[var(--text-primary)]">{logoFiles[0].name}</div>
                        <div className="mt-1 text-xs text-[var(--text-muted)]">{formatFileSize(logoFiles[0].size)}</div>
                        <div className="mt-2 text-xs text-[var(--accent-strong)]">Rendered at {form.logoSizePercent}% dari luas QR.</div>
                      </div>
                    </div>
                    <Button variant="outline" leadingIcon={Trash2} onClick={() => clearLogo()}>
                      Remove logo
                    </Button>
                  </div>
                ) : (
                  <EmptyState
                    icon={ImagePlus}
                    title="Belum ada logo"
                    description="Upload logo bila ingin membuat QR brandable. Sistem akan menyesuaikan correction level agar tetap aman dipindai."
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
                Reset QR module
              </Button>
            </div>
          </div>
        </PageSection>
      </div>

      <div className="space-y-6">
        <PageSection
          title="Live QR Preview"
          description="Preview dirender langsung dari payload final, warna, ukuran, dan opsi logo. Jika input belum valid, overlay akan menjelaskan perbaikannya."
        >
          <div className="space-y-4">
            <div className="surface-panel-alt relative overflow-hidden p-5">
              <div className="flex items-center justify-between gap-3">
                <div className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">Realtime canvas</div>
                <div className="rounded-full border border-[var(--accent-soft)] bg-[var(--accent-surface)] px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-[var(--accent-strong)]">
                  {form.size}px
                </div>
              </div>
              <div className="mt-5 flex justify-center">
                <div
                  className={cn(
                    "relative flex min-h-[380px] w-full items-center justify-center rounded-[28px] border bg-[linear-gradient(180deg,rgba(255,255,255,0.86),rgba(235,245,255,0.92))] p-6",
                    qrBuild.errors.length > 0 && "opacity-65",
                  )}
                >
                  <div ref={containerRef} className="flex items-center justify-center" />
                  {qrBuild.errors.length > 0 ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-[rgba(4,10,18,0.42)] p-6 backdrop-blur-[2px]">
                      <div className="max-w-sm rounded-[26px] border border-amber-300/20 bg-[rgba(11,20,34,0.92)] p-5 text-center">
                        <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-amber-500/12 text-amber-300">
                          <AlertTriangle className="size-6" />
                        </div>
                        <div className="mt-4 text-lg font-semibold text-[var(--text-primary)]">Preview menunggu input valid</div>
                        <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                          Perbaiki field yang ditandai agar payload final bisa dirender dan diexport dengan aman.
                        </p>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <StatCard
                label="Characters"
                value={String(qrBuild.characterCount)}
                caption="Payload lebih panjang akan lebih nyaman dipindai jika memakai ukuran QR yang lebih besar."
              />
              <StatCard
                label="Scan-safe profile"
                value={hasLogo ? "Logo-safe" : "Standard"}
                caption={hasLogo ? `Logo ${form.logoSizePercent}% dengan correction ${qrBuild.effectiveCorrectionLevel}.` : `Correction ${qrBuild.effectiveCorrectionLevel} tanpa overlay tambahan.`}
              />
            </div>
          </div>
        </PageSection>

        <ResultCard
          title="Encoded Payload"
          description="String final inilah yang benar-benar dikodekan ke dalam QR. Sangat berguna untuk verifikasi manual sebelum export."
          rows={[
            { label: "Preset", value: activePreset.label },
            { label: "Foreground", value: form.foregroundColor, mono: true },
            { label: "Background", value: form.backgroundColor, mono: true },
            { label: "Error corr.", value: qrBuild.effectiveCorrectionLevel },
            { label: "Logo", value: hasLogo ? `${form.logoSizePercent}%` : "No logo" },
          ]}
          footer={
            <TextArea
              label="Payload result"
              hint="Readonly preview dari string akhir yang dipakai oleh generator."
              value={qrBuild.data || "Belum ada payload valid."}
              readOnly
              className="min-h-[180px] font-mono text-[13px]"
            />
          }
        />

        <ResultCard
          title="Readiness"
          description="Ringkasan kesiapan modul QR terhadap scanability, export, dan runtime aplikasi saat ini."
          rows={[
            { label: "Status", value: canExport ? "Ready to export" : "Needs input fix" },
            { label: "Preset hint", value: activePreset.description },
            { label: "Runtime", value: bootstrap.source === "rust" ? "Tauri desktop bridge ready" : "Browser preview mode" },
            { label: "WiFi mode", value: form.preset === "wifi" ? getWifiSecurityLabel(form.wifiSecurity) : "Not applicable" },
          ]}
          footer={
            <div className="grid gap-3">
              <ReadinessItem
                icon={ShieldCheck}
                title="Logo-safe guard"
                description="Saat logo aktif, correction level efektif dinaikkan ke H dan slider logo dibatasi di rentang aman."
                tone="cyan"
              />
              <ReadinessItem
                icon={CheckCircle2}
                title="Offline export"
                description="PNG dan SVG dihasilkan secara lokal di frontend, tanpa layanan cloud atau API eksternal."
                tone="emerald"
              />
              <ReadinessItem
                icon={Palette}
                title="Custom styling"
                description="Foreground, background, ukuran, dan preset payload dapat diubah real-time untuk kebutuhan branding."
                tone="amber"
              />
            </div>
          }
        />
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  caption,
}: {
  label: string;
  value: string;
  caption: string;
}) {
  return (
    <div className="surface-panel-alt p-4">
      <div className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">{label}</div>
      <div className="mt-3 text-lg font-semibold text-[var(--text-primary)]">{value}</div>
      <div className="mt-2 text-xs leading-6 text-[var(--text-secondary)]">{caption}</div>
    </div>
  );
}
