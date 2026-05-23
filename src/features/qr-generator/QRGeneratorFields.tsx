import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { TextArea } from "@/components/ui/TextArea";
import { Toggle } from "@/components/ui/Toggle";
import type { QRFormState } from "./qr-generator.types";
import { wifiSecurityOptions } from "./qr-generator.utils";

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
          hint="Gunakan untuk teks bebas, URL, JSON kecil, kode internal, atau payload manual lain."
          placeholder="Masukkan teks atau link yang ingin dikodekan ke QR..."
          value={form.rawText}
          onChange={(event) => updateForm("rawText", event.target.value)}
        />
      );

    case "url":
      return (
        <Input
          label="Destination URL"
          hint="Jika Anda tidak menulis protokol, sistem akan mengasumsikan https://."
          placeholder="https://example.com/product/orion"
          value={form.url}
          onChange={(event) => updateForm("url", event.target.value)}
        />
      );

    case "wifi":
      return (
        <div className="grid gap-4 xl:grid-cols-2">
          <Input
            label="SSID"
            hint="Nama jaringan WiFi yang akan ditampilkan ke scanner."
            placeholder="Orion Office"
            value={form.wifiSsid}
            onChange={(event) => updateForm("wifiSsid", event.target.value)}
          />
          <Select
            label="Security"
            hint="Pilih jenis keamanan jaringan yang benar."
            options={wifiSecurityOptions}
            value={form.wifiSecurity}
            onChange={(event) => updateForm("wifiSecurity", event.target.value as QRFormState["wifiSecurity"])}
          />
          <Input
            label="Password"
            hint="Biarkan kosong hanya jika jaringan Anda benar-benar open network."
            placeholder="Masukkan password WiFi"
            type="password"
            value={form.wifiPassword}
            onChange={(event) => updateForm("wifiPassword", event.target.value)}
          />
          <Toggle
            label="Hidden network"
            hint="Aktifkan hanya jika SSID Anda memang disembunyikan."
            checked={form.wifiHidden}
            onCheckedChange={(checked) => updateForm("wifiHidden", checked)}
          />
        </div>
      );

    case "whatsapp":
      return (
        <div className="grid gap-4">
          <Input
            label="Phone number"
            hint="Gunakan format internasional. Karakter non-angka akan dibersihkan otomatis."
            placeholder="6281234567890"
            value={form.whatsappPhone}
            onChange={(event) => updateForm("whatsappPhone", event.target.value)}
          />
          <TextArea
            label="Prefilled message"
            hint="Opsional. Pesan ini akan langsung muncul saat chat dibuka."
            placeholder="Halo, saya tertarik dengan Orion Utility Suite..."
            value={form.whatsappMessage}
            onChange={(event) => updateForm("whatsappMessage", event.target.value)}
          />
        </div>
      );

    case "email":
      return (
        <div className="grid gap-4">
          <Input
            label="Email recipient"
            hint="Alamat email tujuan yang akan dibuka oleh mail client."
            placeholder="support@example.com"
            value={form.emailTo}
            onChange={(event) => updateForm("emailTo", event.target.value)}
          />
          <Input
            label="Subject"
            hint="Opsional. Isi subject email secara otomatis."
            placeholder="Halo Orion Team"
            value={form.emailSubject}
            onChange={(event) => updateForm("emailSubject", event.target.value)}
          />
          <TextArea
            label="Body"
            hint="Opsional. Cocok untuk CTA, feedback, atau format request standar."
            placeholder="Tulis isi email yang ingin diprefill..."
            value={form.emailBody}
            onChange={(event) => updateForm("emailBody", event.target.value)}
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
            label="Title"
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
            hint="Alamat lengkap akan dimasukkan sebagai field ADR pada vCard."
            placeholder="Jl. Contoh No. 123, Jakarta"
            value={form.contactAddress}
            onChange={(event) => updateForm("contactAddress", event.target.value)}
            className="min-h-[128px] xl:col-span-2"
          />
        </div>
      );
  }
}
