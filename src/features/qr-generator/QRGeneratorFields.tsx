import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { TextArea } from "@/components/ui/TextArea";
import { Toggle } from "@/components/ui/Toggle";
import type { QRFormState } from "./qr-generator.types";
import { wifiEapMethodOptions, wifiPhase2MethodOptions, wifiSecurityOptions } from "./qr-generator.utils";

export function DynamicPresetFields({
  form,
  updateForm,
}: {
  form: QRFormState;
  updateForm: <Key extends keyof QRFormState>(key: Key, value: QRFormState[Key]) => void;
}) {
  switch (form.preset) {
    case "text":
      return (
        <TextArea
          label="Text or link"
          hint="Free-form text, URLs, or short codes."
          placeholder="Enter text or a link to encode into QR..."
          value={form.rawText}
          onChange={(event) => updateForm("rawText", event.target.value)}
        />
      );

    case "url":
      return (
        <Input
          label="Destination URL"
          hint="Orion assumes https:// when protocol is omitted."
          placeholder="https://example.com/product/orion"
          value={form.url}
          onChange={(event) => updateForm("url", event.target.value)}
        />
      );

    case "wifi": {
      const isEnterpriseWifi = form.wifiSecurity === "WPA2-EAP";

      return (
        <div className="grid gap-4 xl:grid-cols-2">
          <Input
            label="SSID"
            hint="WiFi network name shown to scanners."
            placeholder="Orion Office"
            value={form.wifiSsid}
            onChange={(event) => updateForm("wifiSsid", event.target.value)}
          />
          <Select
            label="Security"
            hint="Choose the correct network security type."
            options={wifiSecurityOptions}
            value={form.wifiSecurity}
            onChange={(event) => updateForm("wifiSecurity", event.target.value as QRFormState["wifiSecurity"])}
          />
          {isEnterpriseWifi ? (
            <>
              <Input
                label="Identity"
                hint="Username sent for Enterprise authentication."
                placeholder="username@example.com"
                value={form.wifiIdentity}
                onChange={(event) => updateForm("wifiIdentity", event.target.value)}
              />
              <Input
                label="Anonymous identity"
                hint="Optional outer identity used by some RADIUS setups."
                placeholder="anonymous@example.com"
                value={form.wifiAnonymousIdentity}
                onChange={(event) => updateForm("wifiAnonymousIdentity", event.target.value)}
              />
              <Select
                label="EAP method"
                hint="Choose the method configured by the network admin."
                options={wifiEapMethodOptions}
                value={form.wifiEapMethod}
                onChange={(event) => updateForm("wifiEapMethod", event.target.value as QRFormState["wifiEapMethod"])}
              />
              <Select
                label="Phase 2 auth"
                hint="Common default for PEAP networks is MSCHAPV2."
                options={wifiPhase2MethodOptions}
                value={form.wifiPhase2Method}
                onChange={(event) => updateForm("wifiPhase2Method", event.target.value as QRFormState["wifiPhase2Method"])}
              />
            </>
          ) : null}
          <Input
            label="Password"
            hint={isEnterpriseWifi ? "Enterprise account password for this identity." : "Leave empty only when the network is truly open."}
            placeholder={isEnterpriseWifi ? "Enter account password" : "Enter WiFi password"}
            type="password"
            value={form.wifiPassword}
            onChange={(event) => updateForm("wifiPassword", event.target.value)}
          />
          <Toggle
            label="Hidden network"
            hint="Enable only if your SSID is intentionally hidden."
            checked={form.wifiHidden}
            onCheckedChange={(checked) => updateForm("wifiHidden", checked)}
          />
        </div>
      );
    }

    case "whatsapp":
      return (
        <div className="grid gap-4">
          <Input
            label="Phone number"
            hint="Use international format. Non-numeric characters are cleaned automatically."
            placeholder="6281234567890"
            value={form.whatsappPhone}
            onChange={(event) => updateForm("whatsappPhone", event.target.value)}
          />
          <TextArea
            label="Starting message"
            hint="Optional. This message appears when the chat opens."
            placeholder="Hi, I'm interested in Orion Utility Suite..."
            value={form.whatsappMessage}
            onChange={(event) => updateForm("whatsappMessage", event.target.value)}
            className="min-h-[92px]"
          />
        </div>
      );

    case "email":
      return (
        <div className="grid gap-4">
          <Input
            label="Email recipient"
            hint="Destination email address that opens in the mail client."
            placeholder="support@example.com"
            value={form.emailTo}
            onChange={(event) => updateForm("emailTo", event.target.value)}
          />
          <Input
            label="Subject"
            hint="Optional. Prefill the email subject."
            placeholder="Hello Orion Team"
            value={form.emailSubject}
            onChange={(event) => updateForm("emailSubject", event.target.value)}
          />
          <TextArea
            label="Email body"
            hint="Optional. Useful for CTAs, feedback, or standard request formats."
            placeholder="Write the email body to prefill..."
            value={form.emailBody}
            onChange={(event) => updateForm("emailBody", event.target.value)}
            className="min-h-[92px]"
          />
        </div>
      );

    case "vcard":
      return (
        <div className="grid gap-4 xl:grid-cols-2">
          <Input
            label="First name"
            placeholder="Orion"
            value={form.contactFirstName}
            onChange={(event) => updateForm("contactFirstName", event.target.value)}
          />
          <Input
            label="Last name"
            placeholder="Utility"
            value={form.contactLastName}
            onChange={(event) => updateForm("contactLastName", event.target.value)}
          />
          <Input
            label="Organization"
            placeholder="Orion Labs"
            value={form.contactOrganization}
            onChange={(event) => updateForm("contactOrganization", event.target.value)}
          />
          <Input
            label="Job title"
            placeholder="Desktop Utility Engineer"
            value={form.contactTitle}
            onChange={(event) => updateForm("contactTitle", event.target.value)}
          />
          <Input
            label="Phone"
            placeholder="+62 812 3456 7890"
            value={form.contactPhone}
            onChange={(event) => updateForm("contactPhone", event.target.value)}
          />
          <Input
            label="Email"
            placeholder="hello@orion.local"
            value={form.contactEmail}
            onChange={(event) => updateForm("contactEmail", event.target.value)}
          />
          <Input
            label="Website"
            placeholder="https://orion.local"
            value={form.contactWebsite}
            onChange={(event) => updateForm("contactWebsite", event.target.value)}
          />
          <TextArea
            label="Address"
            hint="Inserted as the vCard ADR field."
            placeholder="123 Example St, Jakarta"
            value={form.contactAddress}
            onChange={(event) => updateForm("contactAddress", event.target.value)}
            className="min-h-[104px] xl:col-span-2"
          />
        </div>
      );
  }
}
