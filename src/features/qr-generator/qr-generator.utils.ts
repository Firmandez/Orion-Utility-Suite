import type { SelectOption } from "@/types/app";
import type {
  QRBuildResult,
  QRFormState,
  QRPresetDefinition,
  WifiSecurity,
} from "./qr-generator.types";

export const MIN_QR_SIZE = 220;
export const MAX_QR_SIZE = 1024;
export const DEFAULT_QR_SIZE = 360;
export const MIN_LOGO_SIZE_PERCENT = 12;
export const MAX_LOGO_SIZE_PERCENT = 28;
export const DEFAULT_LOGO_SIZE_PERCENT = 22;
export const PREVIEW_PLACEHOLDER_DATA = "https://orion-utility-suite.local/preview";

export const qrPresetDefinitions: QRPresetDefinition[] = [
  {
    id: "text",
    label: "Text / Link",
    description: "Payload bebas untuk teks, link, JSON kecil, atau token lokal.",
  },
  {
    id: "url",
    label: "URL",
    description: "Landing page, deep link, atau alamat aplikasi internal.",
  },
  {
    id: "wifi",
    label: "WiFi QR",
    description: "SSID, password, dan mode keamanan untuk koneksi cepat.",
  },
  {
    id: "whatsapp",
    label: "WhatsApp Chat",
    description: "Buka chat WhatsApp dengan nomor dan pesan awal opsional.",
  },
  {
    id: "email",
    label: "Email QR",
    description: "Prefill alamat email, subject, dan body untuk kampanye atau support.",
  },
  {
    id: "vcard",
    label: "vCard / Contact",
    description: "Kontak digital dengan nama, jabatan, telepon, dan detail pendukung.",
  },
];

export const qrErrorCorrectionOptions: SelectOption[] = [
  { value: "L", label: "L - Compact" },
  { value: "M", label: "M - Balanced" },
  { value: "Q", label: "Q - Brand-safe" },
  { value: "H", label: "H - Logo-safe" },
];

export const wifiSecurityOptions: SelectOption[] = [
  { value: "WPA", label: "WPA / WPA2" },
  { value: "WEP", label: "WEP" },
  { value: "nopass", label: "Open network" },
];

export function buildInitialQrFormState(): QRFormState {
  return {
    preset: "url",
    rawText: PREVIEW_PLACEHOLDER_DATA,
    url: PREVIEW_PLACEHOLDER_DATA,
    wifiSsid: "",
    wifiPassword: "",
    wifiSecurity: "WPA",
    wifiHidden: false,
    whatsappPhone: "",
    whatsappMessage: "",
    emailTo: "",
    emailSubject: "",
    emailBody: "",
    contactFirstName: "",
    contactLastName: "",
    contactOrganization: "",
    contactTitle: "",
    contactPhone: "",
    contactEmail: "",
    contactWebsite: "",
    contactAddress: "",
    foregroundColor: "#0F172A",
    backgroundColor: "#FFFFFF",
    size: DEFAULT_QR_SIZE,
    logoSizePercent: DEFAULT_LOGO_SIZE_PERCENT,
    errorCorrectionLevel: "Q",
  };
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function buildQrPayload(form: QRFormState, hasLogo: boolean): QRBuildResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const effectiveCorrectionLevel = hasLogo ? "H" : form.errorCorrectionLevel;
  let data = "";
  let fileStem = "orion-qr";

  if (!isValidHex(form.foregroundColor)) {
    errors.push("Foreground color harus berupa hex 6 digit, misalnya #0F172A.");
  }

  if (!isValidHex(form.backgroundColor)) {
    errors.push("Background color harus berupa hex 6 digit, misalnya #FFFFFF.");
  }

  if (form.foregroundColor.toLowerCase() === form.backgroundColor.toLowerCase()) {
    errors.push("Foreground dan background color tidak boleh sama.");
  }

  if (form.size < MIN_QR_SIZE || form.size > MAX_QR_SIZE) {
    errors.push(`Ukuran QR harus berada di antara ${MIN_QR_SIZE}px dan ${MAX_QR_SIZE}px.`);
  }

  if (form.logoSizePercent < MIN_LOGO_SIZE_PERCENT || form.logoSizePercent > MAX_LOGO_SIZE_PERCENT) {
    errors.push(`Ukuran logo harus berada di antara ${MIN_LOGO_SIZE_PERCENT}% dan ${MAX_LOGO_SIZE_PERCENT}%.`);
  }

  if (hasLogo && form.errorCorrectionLevel !== "H") {
    warnings.push("Logo aktif: error correction efektif dinaikkan ke level H agar QR tetap mudah dipindai.");
  }

  if (hasLogo && form.logoSizePercent > 26) {
    warnings.push("Ukuran logo di atas 26% berisiko menurunkan keterbacaan pada scanner tertentu.");
  }

  switch (form.preset) {
    case "text": {
      data = form.rawText.trim();
      fileStem = "orion-qr-text";
      if (!data) {
        errors.push("Input text/link tidak boleh kosong.");
      }
      break;
    }
    case "url": {
      const normalizedUrl = normalizeUrl(form.url);
      fileStem = "orion-qr-url";
      if (!normalizedUrl) {
        errors.push("URL harus valid. Tambahkan domain yang lengkap atau protokol yang benar.");
      } else {
        data = normalizedUrl;
      }
      break;
    }
    case "wifi": {
      fileStem = "orion-qr-wifi";
      const ssid = form.wifiSsid.trim();
      const password = form.wifiPassword.trim();

      if (!ssid) {
        errors.push("SSID WiFi wajib diisi.");
      }

      if (form.wifiSecurity !== "nopass" && !password) {
        errors.push("Password WiFi wajib diisi untuk jaringan WPA atau WEP.");
      }

      data = `WIFI:T:${escapeWifiValue(form.wifiSecurity)};S:${escapeWifiValue(ssid)};P:${escapeWifiValue(password)};H:${form.wifiHidden ? "true" : "false"};;`;
      break;
    }
    case "whatsapp": {
      fileStem = "orion-qr-whatsapp";
      const normalizedPhone = normalizePhoneNumber(form.whatsappPhone);

      if (!normalizedPhone) {
        errors.push("Nomor WhatsApp wajib diisi dengan format internasional atau angka lokal yang valid.");
      }

      const params = new URLSearchParams();
      if (form.whatsappMessage.trim()) {
        params.set("text", form.whatsappMessage.trim());
      }

      data = `https://wa.me/${normalizedPhone}${params.size > 0 ? `?${params.toString()}` : ""}`;
      break;
    }
    case "email": {
      fileStem = "orion-qr-email";
      const email = form.emailTo.trim();

      if (!isValidEmail(email)) {
        errors.push("Alamat email tujuan tidak valid.");
      }

      const params = new URLSearchParams();
      if (form.emailSubject.trim()) {
        params.set("subject", form.emailSubject.trim());
      }
      if (form.emailBody.trim()) {
        params.set("body", form.emailBody.trim());
      }

      data = `mailto:${email}${params.size > 0 ? `?${params.toString()}` : ""}`;
      break;
    }
    case "vcard": {
      fileStem = "orion-qr-contact";
      const firstName = form.contactFirstName.trim();
      const lastName = form.contactLastName.trim();
      const organization = form.contactOrganization.trim();
      const phone = form.contactPhone.trim();
      const email = form.contactEmail.trim();
      const website = form.contactWebsite.trim();

      if (!firstName && !lastName && !organization) {
        errors.push("Isi minimal nama depan, nama belakang, atau nama organisasi untuk vCard.");
      }

      if (!phone && !email) {
        errors.push("Isi minimal satu detail kontak: nomor telepon atau email.");
      }

      if (email && !isValidEmail(email)) {
        errors.push("Email kontak pada vCard tidak valid.");
      }

      if (website && !normalizeUrl(website)) {
        errors.push("Website kontak harus berupa URL yang valid.");
      }

      const fullName = [firstName, lastName].filter(Boolean).join(" ").trim();
      const lines = [
        "BEGIN:VCARD",
        "VERSION:3.0",
        `N:${escapeVCard(lastName)};${escapeVCard(firstName)};;;`,
      ];

      if (fullName) {
        lines.push(`FN:${escapeVCard(fullName)}`);
      } else if (organization) {
        lines.push(`FN:${escapeVCard(organization)}`);
      }

      if (organization) {
        lines.push(`ORG:${escapeVCard(organization)}`);
      }

      if (form.contactTitle.trim()) {
        lines.push(`TITLE:${escapeVCard(form.contactTitle.trim())}`);
      }

      if (phone) {
        lines.push(`TEL;TYPE=CELL:${escapeVCard(phone)}`);
      }

      if (email) {
        lines.push(`EMAIL:${escapeVCard(email)}`);
      }

      if (website) {
        lines.push(`URL:${escapeVCard(normalizeUrl(website) ?? website)}`);
      }

      if (form.contactAddress.trim()) {
        lines.push(`ADR:;;${escapeVCard(form.contactAddress.trim())};;;;`);
      }

      lines.push("END:VCARD");
      data = lines.join("\n");
      break;
    }
  }

  if (data.length > 900) {
    warnings.push("Payload cukup panjang. Gunakan size lebih besar untuk menjaga hasil scan tetap stabil.");
  }

  return {
    data,
    errors,
    warnings,
    fileStem,
    characterCount: data.length,
    effectiveCorrectionLevel,
  };
}

export function buildQrFileName(fileStem: string, extension: "png" | "svg") {
  const timestamp = new Date()
    .toISOString()
    .replace(/[:.]/g, "-")
    .replace("T", "_")
    .slice(0, 19);

  return `${fileStem}_${timestamp}.${extension}`;
}

export function getWifiSecurityLabel(value: WifiSecurity) {
  const match = wifiSecurityOptions.find((option) => option.value === value);
  return match?.label ?? value;
}

function normalizeUrl(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  const withProtocol = /^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(trimmed) ? trimmed : `https://${trimmed}`;

  try {
    return new URL(withProtocol).toString();
  } catch {
    return null;
  }
}

function normalizePhoneNumber(value: string) {
  return value.replace(/[^\d]/g, "");
}

function escapeWifiValue(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/:/g, "\\:");
}

function escapeVCard(value: string) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,");
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isValidHex(value: string) {
  return /^#[0-9a-fA-F]{6}$/.test(value);
}
