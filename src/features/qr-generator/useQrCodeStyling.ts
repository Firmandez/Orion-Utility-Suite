import QRCodeStyling, { type ErrorCorrectionLevel, type FileExtension } from "qr-code-styling";
import { useEffect, useEffectEvent, useRef } from "react";
import { buildQrFileName, DEFAULT_LOGO_SIZE_PERCENT } from "./qr-generator.utils";

interface UseQrCodeStylingOptions {
  data: string;
  foregroundColor: string;
  backgroundColor: string;
  size: number;
  effectiveCorrectionLevel: ErrorCorrectionLevel;
  logoUrl?: string | null;
  logoSizePercent?: number;
}

function buildMimeType(extension: FileExtension) {
  switch (extension) {
    case "svg":
      return "image/svg+xml";
    case "jpeg":
      return "image/jpeg";
    case "webp":
      return "image/webp";
    default:
      return "image/png";
  }
}

export function useQrCodeStyling({
  data,
  foregroundColor,
  backgroundColor,
  size,
  effectiveCorrectionLevel,
  logoUrl,
  logoSizePercent = DEFAULT_LOGO_SIZE_PERCENT,
}: UseQrCodeStylingOptions) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const qrCodeRef = useRef<QRCodeStyling | null>(null);

  useEffect(() => {
    const container = containerRef.current;

    if (!container) {
      return;
    }

    container.replaceChildren();

    const qrCode = new QRCodeStyling({
      type: "svg",
      width: size,
      height: size,
      margin: 14,
      data,
      image: logoUrl ?? undefined,
      qrOptions: {
        mode: "Byte",
        errorCorrectionLevel: effectiveCorrectionLevel,
      },
      dotsOptions: {
        type: "rounded",
        color: foregroundColor,
      },
      cornersSquareOptions: {
        type: "extra-rounded",
        color: foregroundColor,
      },
      cornersDotOptions: {
        type: "dot",
        color: foregroundColor,
      },
      backgroundOptions: {
        round: 0,
        color: backgroundColor,
      },
      imageOptions: {
        hideBackgroundDots: Boolean(logoUrl),
        imageSize: logoUrl ? logoSizePercent / 100 : 0.4,
        margin: logoUrl ? 6 : 0,
        saveAsBlob: true,
      },
    });

    qrCode.append(container);
    qrCodeRef.current = qrCode;

    return () => {
      container.replaceChildren();
    };
  }, [backgroundColor, data, effectiveCorrectionLevel, foregroundColor, logoSizePercent, logoUrl, size]);

  const exportQr = useEffectEvent(async (extension: Extract<FileExtension, "png" | "svg">, fileStem: string) => {
    const qrCode = qrCodeRef.current;

    if (!qrCode) {
      throw new Error("QR preview is not ready to export.");
    }

    const rawData = await qrCode.getRawData(extension);

    if (!rawData) {
      throw new Error("QR library did not return export data.");
    }

    const blob = rawData instanceof Blob ? rawData : new Blob([rawData], { type: buildMimeType(extension) });
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = buildQrFileName(fileStem, extension);
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(objectUrl);
  });

  return {
    containerRef,
    exportQr,
  };
}
