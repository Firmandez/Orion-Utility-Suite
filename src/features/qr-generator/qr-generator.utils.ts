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
    description: "Text, links, small JSON snippets, or short codes.",
  },
  {
    id: "url",
    label: "URL",
    description: "Landing pages, deep links, or internal app addresses.",
  },
  {
    id: "wifi",
    label: "WiFi QR",
    description: "SSID, personal password, or Enterprise identity details.",
  },
  {
    id: "whatsapp",
    label: "Chat WhatsApp",
    description: "Open a WhatsApp chat with a number and optional starting message.",
  },
  {
    id: "email",
    label: "Email",
    description: "Prefill email address, subject, and body for campaigns or support.",
  },
  {
    id: "vcard",
    label: "vCard / Contact",
    description: "Digital contact with name, title, phone, and supporting details.",
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
  { value: "WPA2-EAP", label: "WPA/WPA2 Enterprise" },
  { value: "nopass", label: "Open network" },
];

export const wifiEapMethodOptions: SelectOption[] = [
  { value: "PEAP", label: "PEAP" },
  { value: "TTLS", label: "TTLS" },
];

export const wifiPhase2MethodOptions: SelectOption[] = [
  { value: "MSCHAPV2", label: "MSCHAPV2" },
  { value: "PAP", label: "PAP" },
  { value: "CHAP", label: "CHAP" },
  { value: "GTC", label: "GTC" },
  { value: "None", label: "None" },
];

export function buildInitialQrFormState(): QRFormState {
  return {
    preset: "url",
    rawText: PREVIEW_PLACEHOLDER_DATA,
    url: PREVIEW_PLACEHOLDER_DATA,
    wifiSsid: "",
    wifiPassword: "",
    wifiSecurity: "WPA",
    wifiIdentity: "",
    wifiAnonymousIdentity: "",
    wifiEapMethod: "PEAP",
    wifiPhase2Method: "MSCHAPV2",
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
    errors.push("Foreground color must be a 6-digit hex value, for example #0F172A.");
  }

  if (!isValidHex(form.backgroundColor)) {
    errors.push("Background color must be a 6-digit hex value, for example #FFFFFF.");
  }

  if (form.foregroundColor.toLowerCase() === form.backgroundColor.toLowerCase()) {
    errors.push("Foreground and background colors cannot be the same.");
  }

  if (form.size < MIN_QR_SIZE || form.size > MAX_QR_SIZE) {
    errors.push(`QR size must be between ${MIN_QR_SIZE}px and ${MAX_QR_SIZE}px.`);
  }

  if (form.logoSizePercent < MIN_LOGO_SIZE_PERCENT || form.logoSizePercent > MAX_LOGO_SIZE_PERCENT) {
    errors.push(`Logo size must be between ${MIN_LOGO_SIZE_PERCENT}% and ${MAX_LOGO_SIZE_PERCENT}%.`);
  }

  if (hasLogo && form.errorCorrectionLevel !== "H") {
    warnings.push("Logo active: effective error correction was raised to level H to keep the QR easy to scan.");
  }

  if (hasLogo && form.logoSizePercent > 26) {
    warnings.push("Logo sizes above 26% may reduce readability on some scanners.");
  }

  switch (form.preset) {
    case "text": {
      data = form.rawText.trim();
      fileStem = "orion-qr-text";
      if (!data) {
        errors.push("Text/link input cannot be empty.");
      }
      break;
    }
    case "url": {
      const normalizedUrl = normalizeUrl(form.url);
      fileStem = "orion-qr-url";
      if (!normalizedUrl) {
        errors.push("URL must be valid. Add a complete domain or the correct protocol.");
      } else {
        data = normalizedUrl;
      }
      break;
    }
    case "wifi": {
      fileStem = "orion-qr-wifi";
      const ssid = form.wifiSsid.trim();
      const password = form.wifiPassword.trim();
      const identity = form.wifiIdentity.trim();
      const anonymousIdentity = form.wifiAnonymousIdentity.trim();
      const isEnterprise = form.wifiSecurity === "WPA2-EAP";

      if (!ssid) {
        errors.push("WiFi SSID is required.");
      }

      if (isEnterprise && !identity) {
        errors.push("WiFi Enterprise identity or username is required.");
      }

      if (form.wifiSecurity !== "nopass" && !password) {
        errors.push("WiFi password is required for secured networks.");
      }

      if (isEnterprise) {
        warnings.push("Enterprise WiFi QR compatibility depends on the scanner and operating system.");
        data = [
          `WIFI:T:${escapeWifiValue(form.wifiSecurity)}`,
          `S:${escapeWifiValue(ssid)}`,
          `E:${escapeWifiValue(form.wifiEapMethod)}`,
          `PH2:${escapeWifiValue(form.wifiPhase2Method)}`,
          anonymousIdentity ? `A:${escapeWifiValue(anonymousIdentity)}` : undefined,
          `I:${escapeWifiValue(identity)}`,
          `P:${escapeWifiValue(password)}`,
          `H:${form.wifiHidden ? "true" : "false"}`,
        ]
          .filter(Boolean)
          .join(";")
          .concat(";;");
      } else {
        data = `WIFI:T:${escapeWifiValue(form.wifiSecurity)};S:${escapeWifiValue(ssid)};P:${escapeWifiValue(password)};H:${form.wifiHidden ? "true" : "false"};;`;
      }
      break;
    }
    case "whatsapp": {
      fileStem = "orion-qr-whatsapp";
      const normalizedPhone = normalizePhoneNumber(form.whatsappPhone);

      if (!normalizedPhone) {
        errors.push("WhatsApp number is required in international format or as a valid local number.");
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
        errors.push("Recipient email address is not valid.");
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
        errors.push("Enter at least a first name, last name, or organization name for the vCard.");
      }

      if (!phone && !email) {
        errors.push("Enter at least one contact detail: phone number or email.");
      }

      if (email && !isValidEmail(email)) {
        errors.push("Contact email in the vCard is not valid.");
      }

      if (website && !normalizeUrl(website)) {
        errors.push("Contact website must be a valid URL.");
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
    warnings.push("Content is fairly long. Use a larger QR size to keep scanning stable.");
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
