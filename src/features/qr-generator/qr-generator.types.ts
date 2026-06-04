import type { ErrorCorrectionLevel } from "qr-code-styling";

export type QRPresetId = "text" | "url" | "wifi" | "whatsapp" | "email" | "vcard";
export type WifiSecurity = "WPA" | "WEP" | "nopass" | "WPA2-EAP";
export type WifiEapMethod = "PEAP" | "TTLS";
export type WifiPhase2Method = "MSCHAPV2" | "PAP" | "CHAP" | "GTC" | "None";

export interface QRFormState {
  preset: QRPresetId;
  rawText: string;
  url: string;
  wifiSsid: string;
  wifiPassword: string;
  wifiSecurity: WifiSecurity;
  wifiIdentity: string;
  wifiAnonymousIdentity: string;
  wifiEapMethod: WifiEapMethod;
  wifiPhase2Method: WifiPhase2Method;
  wifiHidden: boolean;
  whatsappPhone: string;
  whatsappMessage: string;
  emailTo: string;
  emailSubject: string;
  emailBody: string;
  contactFirstName: string;
  contactLastName: string;
  contactOrganization: string;
  contactTitle: string;
  contactPhone: string;
  contactEmail: string;
  contactWebsite: string;
  contactAddress: string;
  foregroundColor: string;
  backgroundColor: string;
  size: number;
  logoSizePercent: number;
  errorCorrectionLevel: ErrorCorrectionLevel;
}

export interface QRBuildResult {
  data: string;
  errors: string[];
  warnings: string[];
  fileStem: string;
  characterCount: number;
  effectiveCorrectionLevel: ErrorCorrectionLevel;
}

export interface QRPresetDefinition {
  id: QRPresetId;
  label: string;
  description: string;
}
