<p align="center">
  <img src="https://github.com/user-attachments/assets/c56cc908-01bb-44b7-b8df-ab2bbbbcfcc6" alt="Orion Utility Suite Logo" width="128" height="128" />
</p>

<h1 align="center">Orion Utility Suite</h1>

<p align="center">
  <a href="#-english">🇺🇸 English</a> | <a href="#-bahasa-indonesia">🇮🇩 Bahasa Indonesia</a>
</p>

---

## 🇺🇸 English

Orion Utility Suite is a cross-platform, offline-first desktop utility app for Windows, Linux, and macOS. The app uses React, TypeScript, Tauri v2, and Rust so core workflows can run locally without Node.js/Express, PHP/Laravel, or cloud API dependencies at runtime.

Current project version: **0.4.9**.

### 🚀 Active Modules & Features

- **Dashboard & Diagnostics**: Shows OS details, CPU architecture, local IP data, gateway status, and offline runtime checks.
- **QR Generator**: Creates QR codes for text, links, Wi-Fi, WhatsApp, email, and vCard/contact data with live preview plus PNG/SVG export.
- **Image Converter**: Converts and compresses batches of local images to JPEG, PNG, or WebP with resize options and Rust-side progress events.
- **PDF Tools**: Merges PDFs, splits PDFs, creates PDFs from images, and renders PDF pages to PNG images through bundled Google PDFium libraries.
- **Text Utilities**: Formats JSON, encodes/decodes Base64 and URLs, creates slugs, and counts text locally.
- **Hash Checker**: Generates MD5, SHA-1, and SHA-256 checksums with a streaming Rust reader for large local files.
- **Network Toolkit**: Checks local IP, DNS lookup, ping latency, port availability, HTTP status, subnet scanning, and Wi-Fi diagnostics. Wi-Fi scanning is currently Windows-only.
- **Advanced Tools**: Includes UUID generation, timestamp conversion, regex testing, JWT decoding, and color conversion.
- **Settings**: Persists theme, accent color, default output folder, window preferences, app metadata, and update checks through Tauri plugins.

### 🛠️ Core Tech Stack

- **Tauri v2**: Desktop shell, native commands, updater, process, dialog, and store plugins.
- **Rust**: Local backend for file, image, PDF, hash, network, and system operations.
- **React 19 + TypeScript**: Frontend application layer.
- **Vite 8**: Frontend development and production bundling.
- **Tailwind CSS v4**: Styling system.

---

### 📂 Folder Structure

```text
.
├─ .github/
│  └─ workflows/
├─ scripts/
├─ src/
│  ├─ app/
│  ├─ assets/
│  ├─ components/
│  ├─ data/
│  ├─ features/
│  ├─ generated/
│  ├─ hooks/
│  ├─ lib/
│  ├─ pages/
│  ├─ services/
│  └─ types/
├─ src-tauri/
│  ├─ capabilities/
│  ├─ icons/
│  ├─ resources/
│  │  └─ pdfium/
│  └─ src/
├─ updater/
│  └─ update.json
├─ index.html
├─ package.json
└─ vite.config.ts
```

---

### ⚙️ Prerequisites

Before installing or building the project, make sure your machine has:

1. **Node.js** v20 or newer.
2. **Rust stable toolchain** installed through `rustup`.
3. **Tauri v2 OS prerequisites** for your platform:
   - [Tauri v2 Prerequisites](https://v2.tauri.app/start/prerequisites/)
   - [Tauri v2 + Vite Quickstart](https://v2.tauri.app/start/frontend/vite/)

On Windows, install the Microsoft C++ Build Tools / MSVC toolchain. On Linux, install the GTK/WebKit packages required by Tauri. On macOS, install Xcode Command Line Tools.

---

### 📦 Installation

Install frontend and Tauri CLI dependencies from the project root:

```bash
npm install
```

When changing the version in `package.json`, run:

```bash
npm run sync:version
```

This syncs `package-lock.json`, `src-tauri/Cargo.toml`, `src-tauri/tauri.conf.json`, and `src/generated/app-version.ts`. The same sync script also runs automatically before `dev`, `build`, `preview`, and the generic `tauri` script.

---

### 💻 Development

Run a browser-only preview:

```bash
npm run dev
```

Run the full desktop app with the Rust/Tauri backend:

```bash
npm run tauri -- dev
```

---

### 🔨 Build Commands

Build the production frontend:

```bash
npm run build
```

Build the desktop app for the active platform:

```bash
npm run tauri -- build
```

The Tauri build compiles the frontend first, then compiles the Rust app and packages the platform bundle. On Windows, `src-tauri/tauri.windows.conf.json` limits bundle output to **NSIS** installers, so MSI is intentionally skipped.

The custom wrapper `scripts/run-tauri-build.mjs` runs the local Tauri CLI from `node_modules`, clears old bundled outputs for installer builds, and on Windows redirects temporary build files to `.orion-build-temp` in the project root.

---

### 💾 Windows Packaging

Build the standard NSIS setup installer:

```bash
npm run tauri:installer
```

Installer output is written to:

```text
src-tauri/target/release/bundle/nsis/
```

If `TAURI_SIGNING_PRIVATE_KEY` is available during the build, Tauri can also generate the signed updater artifacts required by the auto-updater.

Build a no-bundle portable release executable:

```bash
npm run tauri:portable
```

Main executable output:

```text
src-tauri/target/release/orion-utility-suite.exe
```

For a portable ZIP, keep the PDFium resource layout with the executable. PDF-to-image needs the Windows library at one of the runtime lookup paths, such as:

```text
resources/pdfium/windows-x64/pdfium.dll
```

Do not flatten the DLL to the same folder as the executable if you expect PDF-to-image to work in a portable package.

The GitHub release workflow also uploads a portable ZIP artifact for Windows after the Tauri release step.

---

### 🔄 Updater

The Tauri updater is currently enabled in `src-tauri/tauri.conf.json` with:

- `createUpdaterArtifacts: true`
- `tauri-plugin-updater`
- `tauri-plugin-process` for relaunching after install
- Update endpoint: `https://raw.githubusercontent.com/Firmandez/Orion-Utility-Suite/main/updater/update.json`
- Frontend check/update flow in `src/features/settings/SettingsWorkspace.tsx`
- Permissions in `src-tauri/capabilities/default.json`

Signed updater builds require the Tauri signing key:

```powershell
$env:TAURI_SIGNING_PRIVATE_KEY="YOUR_PRIVATE_KEY"
$env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD="YOUR_OPTIONAL_PASSWORD"
npm run tauri:installer
```

The GitHub Actions workflow expects the same values as repository secrets named `TAURI_SIGNING_PRIVATE_KEY` and `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`.

Release flow:

1. Update the version in `package.json`.
2. Run `npm run sync:version`.
3. Commit the version changes.
4. Run `npm run git:tag` to create and push `v<version>`, which triggers `.github/workflows/release.yml`.
5. Wait for the draft GitHub Release to build the installer and `.sig` signature.
6. Update `updater/update.json` with the current version, publish date, installer URL, and exact `.sig` contents.
7. Commit and push the updated `updater/update.json`.
8. Publish the GitHub Release when the installer and updater metadata are correct.

Important: `updater/update.json` must match the released installer. If its signature is still a placeholder, or its URL points to an older tag, the updater metadata is not ready for production use.

---

### 🧩 PDFium Notes

PDF-to-image rendering uses `pdfium-render` and bundled native Google PDFium libraries. The current supported resource folders are:

```text
src-tauri/resources/pdfium/windows-x64/pdfium.dll
src-tauri/resources/pdfium/linux-x64/libpdfium.so
src-tauri/resources/pdfium/macos-x64/libpdfium.dylib
src-tauri/resources/pdfium/macos-arm64/libpdfium.dylib
```

The platform-specific Tauri config files include the matching PDFium resources during packaging:

- `src-tauri/tauri.windows.conf.json`
- `src-tauri/tauri.linux.conf.json`
- `src-tauri/tauri.macos.conf.json`

Keep these files intact when building or distributing Orion. The app first looks for bundled PDFium resources, then falls back to a system PDFium installation if one is available.

---

### 🔒 Known Limitations

- Native file/folder picking requires host OS permissions.
- Wi-Fi scanning currently supports Windows only; Linux and macOS support is planned.
- Network operations can behave differently depending on firewall rules, adapter permissions, and OS network policy.
- Building inside heavily sandboxed or virtualized environments can trigger Rust file-lock or permission issues. A standard local developer machine is recommended.

---

### 📄 License & Credits

- **License**: MIT.
- **pdfium-render**: Rust wrapper by **ajrcarey** for binding Google PDFium. Licensed under MIT. [GitHub Repository](https://github.com/ajrcarey/pdfium-render)
- **Google PDFium**: C++ PDF rendering engine by Google LLC. Licensed under BSD 3-Clause. [Official PDFium Site](https://pdfium.googlesource.com/pdfium/)

---

## 🇮🇩 Bahasa Indonesia

Orion Utility Suite adalah aplikasi desktop *cross-platform* dan *offline-first* untuk Windows, Linux, dan macOS. Aplikasi ini menggunakan React, TypeScript, Tauri v2, dan Rust agar alur kerja utama berjalan lokal tanpa dependensi runtime ke Node.js/Express, PHP/Laravel, atau API cloud.

Versi proyek saat ini: **0.4.9**.

### 🚀 Modul & Fitur Aktif

- **Dashboard & Diagnostics**: Menampilkan detail OS, arsitektur CPU, data IP lokal, status gateway, dan pengecekan runtime offline.
- **QR Generator**: Membuat QR untuk teks, tautan, Wi-Fi, WhatsApp, email, dan vCard/kontak dengan pratinjau langsung serta ekspor PNG/SVG.
- **Image Converter**: Mengonversi dan mengompresi gambar lokal secara batch ke JPEG, PNG, atau WebP dengan opsi resize dan progress event dari Rust.
- **PDF Tools**: Menggabungkan PDF, memecah PDF, membuat PDF dari gambar, dan merender halaman PDF menjadi PNG memakai pustaka Google PDFium yang dibundel.
- **Text Utilities**: Memformat JSON, encode/decode Base64 dan URL, membuat slug, serta menghitung teks secara lokal.
- **Hash Checker**: Membuat checksum MD5, SHA-1, dan SHA-256 memakai pembaca streaming di Rust untuk berkas lokal berukuran besar.
- **Network Toolkit**: Mengecek IP lokal, DNS lookup, latensi ping, ketersediaan port, status HTTP, pemindaian subnet, dan diagnostik Wi-Fi. Pemindaian Wi-Fi saat ini hanya tersedia di Windows.
- **Advanced Tools**: Berisi generator UUID, konversi timestamp, pengujian regex, decoding JWT, dan konversi warna.
- **Settings**: Menyimpan tema, warna aksen, folder output default, preferensi jendela, metadata aplikasi, dan pemeriksaan update melalui plugin Tauri.

### 🛠️ Stack Utama

- **Tauri v2**: Shell desktop, native command, updater, process, dialog, dan store plugin.
- **Rust**: Backend lokal untuk operasi file, gambar, PDF, hash, jaringan, dan sistem.
- **React 19 + TypeScript**: Lapisan aplikasi frontend.
- **Vite 8**: Development server dan bundling produksi frontend.
- **Tailwind CSS v4**: Sistem styling.

---

### 📂 Struktur Folder

```text
.
├─ .github/
│  └─ workflows/
├─ scripts/
├─ src/
│  ├─ app/
│  ├─ assets/
│  ├─ components/
│  ├─ data/
│  ├─ features/
│  ├─ generated/
│  ├─ hooks/
│  ├─ lib/
│  ├─ pages/
│  ├─ services/
│  └─ types/
├─ src-tauri/
│  ├─ capabilities/
│  ├─ icons/
│  ├─ resources/
│  │  └─ pdfium/
│  └─ src/
├─ updater/
│  └─ update.json
├─ index.html
├─ package.json
└─ vite.config.ts
```

---

### ⚙️ Prasyarat

Sebelum menginstal atau membangun proyek, pastikan mesin Anda memiliki:

1. **Node.js** v20 atau lebih baru.
2. **Rust stable toolchain** melalui `rustup`.
3. **Tauri v2 OS prerequisites** sesuai platform:
   - [Tauri v2 Prerequisites](https://v2.tauri.app/start/prerequisites/)
   - [Tauri v2 + Vite Quickstart](https://v2.tauri.app/start/frontend/vite/)

Di Windows, pasang Microsoft C++ Build Tools / MSVC toolchain. Di Linux, pasang paket GTK/WebKit yang diperlukan Tauri. Di macOS, pasang Xcode Command Line Tools.

---

### 📦 Instalasi

Instal dependensi frontend dan Tauri CLI dari root proyek:

```bash
npm install
```

Saat mengubah versi di `package.json`, jalankan:

```bash
npm run sync:version
```

Script ini menyelaraskan `package-lock.json`, `src-tauri/Cargo.toml`, `src-tauri/tauri.conf.json`, dan `src/generated/app-version.ts`. Script yang sama juga berjalan otomatis sebelum `dev`, `build`, `preview`, dan script generik `tauri`.

---

### 💻 Development

Jalankan pratinjau browser saja:

```bash
npm run dev
```

Jalankan aplikasi desktop penuh dengan backend Rust/Tauri:

```bash
npm run tauri -- dev
```

---

### 🔨 Perintah Build

Build frontend produksi:

```bash
npm run build
```

Build aplikasi desktop untuk platform aktif:

```bash
npm run tauri -- build
```

Build Tauri akan mengompilasi frontend terlebih dahulu, lalu mengompilasi aplikasi Rust dan membuat paket sesuai platform. Di Windows, `src-tauri/tauri.windows.conf.json` membatasi output bundle ke **NSIS**, sehingga MSI sengaja dilewati.

Wrapper khusus `scripts/run-tauri-build.mjs` menjalankan Tauri CLI lokal dari `node_modules`, membersihkan output bundle lama untuk build installer, dan di Windows mengarahkan file sementara build ke `.orion-build-temp` di root proyek.

---

### 💾 Packaging Windows

Build installer NSIS standar:

```bash
npm run tauri:installer
```

Output installer ditulis ke:

```text
src-tauri/target/release/bundle/nsis/
```

Jika `TAURI_SIGNING_PRIVATE_KEY` tersedia saat build, Tauri dapat membuat artifact bertanda tangan yang dibutuhkan auto-updater.

Build executable release tanpa bundle installer:

```bash
npm run tauri:portable
```

Output executable utama:

```text
src-tauri/target/release/orion-utility-suite.exe
```

Untuk ZIP portable, pertahankan layout resource PDFium bersama executable. Fitur PDF-to-image memerlukan library Windows pada salah satu path runtime, misalnya:

```text
resources/pdfium/windows-x64/pdfium.dll
```

Jangan *flatten* DLL ke folder yang sama dengan executable jika fitur PDF-to-image harus tetap berjalan di paket portable.

Workflow rilis GitHub juga mengunggah artifact ZIP portable untuk Windows setelah langkah rilis Tauri selesai.

---

### 🔄 Updater

Updater Tauri saat ini aktif di `src-tauri/tauri.conf.json` dengan:

- `createUpdaterArtifacts: true`
- `tauri-plugin-updater`
- `tauri-plugin-process` untuk relaunch setelah install
- Endpoint update: `https://raw.githubusercontent.com/Firmandez/Orion-Utility-Suite/main/updater/update.json`
- Alur check/update frontend di `src/features/settings/SettingsWorkspace.tsx`
- Permission di `src-tauri/capabilities/default.json`

Build updater bertanda tangan memerlukan signing key Tauri:

```powershell
$env:TAURI_SIGNING_PRIVATE_KEY="PRIVATE_KEY_ANDA"
$env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD="PASSWORD_OPSIONAL_ANDA"
npm run tauri:installer
```

Workflow GitHub Actions memakai nilai yang sama dari repository secrets bernama `TAURI_SIGNING_PRIVATE_KEY` dan `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`.

Alur rilis:

1. Ubah versi di `package.json`.
2. Jalankan `npm run sync:version`.
3. Commit perubahan versi.
4. Jalankan `npm run git:tag` untuk membuat dan push `v<version>`, yang akan memicu `.github/workflows/release.yml`.
5. Tunggu draft GitHub Release membuat installer dan signature `.sig`.
6. Perbarui `updater/update.json` dengan versi, tanggal rilis, URL installer, dan isi `.sig` yang sesuai.
7. Commit dan push `updater/update.json` terbaru.
8. Publish GitHub Release setelah installer dan metadata updater benar.

Penting: `updater/update.json` harus cocok dengan installer yang dirilis. Jika signature masih placeholder, atau URL masih mengarah ke tag lama, metadata updater belum siap dipakai di produksi.

---

### 🧩 Catatan PDFium

Rendering PDF-to-image menggunakan `pdfium-render` dan pustaka native Google PDFium yang dibundel. Folder resource yang saat ini didukung adalah:

```text
src-tauri/resources/pdfium/windows-x64/pdfium.dll
src-tauri/resources/pdfium/linux-x64/libpdfium.so
src-tauri/resources/pdfium/macos-x64/libpdfium.dylib
src-tauri/resources/pdfium/macos-arm64/libpdfium.dylib
```

File konfigurasi Tauri per platform memasukkan resource PDFium yang sesuai saat packaging:

- `src-tauri/tauri.windows.conf.json`
- `src-tauri/tauri.linux.conf.json`
- `src-tauri/tauri.macos.conf.json`

Jangan hapus file-file ini saat build atau distribusi Orion. Aplikasi akan mencari PDFium yang dibundel terlebih dahulu, lalu fallback ke instalasi PDFium sistem jika tersedia.

---

### 🔒 Batasan yang Diketahui

- Pemilihan file/folder native memerlukan izin dari OS.
- Pemindaian Wi-Fi saat ini hanya mendukung Windows; dukungan Linux dan macOS direncanakan.
- Operasi jaringan dapat berbeda tergantung firewall, izin adapter, dan kebijakan jaringan OS.
- Build di lingkungan yang terlalu tersandbox atau virtual dapat memicu masalah file lock atau izin Rust. Mesin lokal developer standar lebih disarankan.

---

### 📄 Lisensi & Kredit

- **Lisensi**: MIT.
- **pdfium-render**: Wrapper Rust oleh **ajrcarey** untuk binding Google PDFium. Berlisensi MIT. [Repositori GitHub](https://github.com/ajrcarey/pdfium-render)
- **Google PDFium**: Engine rendering PDF C++ oleh Google LLC. Berlisensi BSD 3-Clause. [Situs Resmi PDFium](https://pdfium.googlesource.com/pdfium/)
