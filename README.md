<p align="center">
  <img src="https://github.com/user-attachments/assets/c56cc908-01bb-44b7-b8df-ab2bbbbcfcc6" alt="Orion Utility Suite Logo" width="128" height="128" />
</p>

<h1 align="center">Orion Utility Suite</h1>

<p align="center">
  <a href="#-english">🇺🇸 English</a> | <a href="#-bahasa-indonesia">🇮🇩 Bahasa Indonesia</a>
</p>

---

## 🇺🇸 English

Orion Utility Suite is a cross-platform, all-in-one desktop utility application for Windows, Linux, and macOS built with a strict **offline-first** architecture. All core backend operations run entirely locally using Tauri and Rust, without any reliance on Node.js/Express, PHP/Laravel, or cloud-based APIs, ensuring ultimate data privacy and native execution speed.

### 🚀 Active Modules & Features

- **Dashboard & Diagnostics**: Live interactive HUD displaying operating system specific info, CPU architecture, local IP, gateway status, and offline security check.
- **Image Converter**: Multithreaded Rust-powered batch image compression and format conversion (PNG, JPEG, WebP) with custom resizing options—engineered to keep the UI fully responsive.
- **PDF Tools**: Native Rust document utilities to merge, split, convert images to PDF, and convert PDF pages into high-resolution images via native Google PDFium rendering.
- **Network Toolkit**: Native diagnostic suite including subnet scanner, neighboring Wi-Fi analyzer, ping latency tracker, port scanner, DNS lookup, and HTTP status checker.
- **Hash Checker**: Ultra-fast file checksum generation (MD5, SHA-1, SHA-256, SHA-512) utilizing a memory-efficient streaming buffer in Rust for files of any size.
- **QR Generator**: Custom styling, gradients, and custom colors for interactive QR code generation.
- **Text & Developer Tools**: Local text calculators, passphrase validators, and frontend developer helpers.
- **Persistent Settings**: Multi-theme support (Light, Dark, System) and custom accent configurations persisted via Tauri Store.

### 🛠️ Core Tech Stack

- **Tauri v2** (Rust Backend & App Shell)
- **React 19** & **TypeScript** (Frontend Engine)
- **Vite** (Build Tool)
- **Tailwind CSS v4** (Styling Framework)

---

### 📂 Folder Structure

```text
.
|- src/
|  |- app/
|  |- components/
|  |- data/
|  |- features/
|  |- lib/
|  |- pages/
|  |- services/
|  `- types/
|- src-tauri/
|  |- capabilities/
|  |- icons/
|  `- src/
|- index.html
|- package.json
`- vite.config.ts
```

---

### ⚙️ Prerequisites

Before building or running the project, ensure your machine meets the following requirements:
1. **Node.js** v20 or newer
2. **Rust Toolchain** (via `rustup`)
3. **Tauri v2 Prerequisites** specific to your OS:
   - Refer to the official [Tauri v2 Prerequisites Guide](https://v2.tauri.app/start/prerequisites/)
   - Refer to the [Tauri v2 + Vite Quickstart Guide](https://v2.tauri.app/start/frontend/vite/)

---

### 📦 Installation

To install frontend and build dependencies:
```bash
npm install
```

---

### 💻 Running Development Server

For standard web browser preview (mock workspace without native commands):
```bash
npm run dev
```

For full desktop application runtime (React UI connected to native Rust backend):
```bash
npm run tauri dev
```

---

### 🔨 Compilation & Build Commands

Build production frontend bundles:
```bash
npm run build
```

Build default platform-specific desktop app packages:
```bash
npm run tauri build
```
This builds production-ready frontend assets, compiles the Rust backend, and packages the desktop installer for your active OS.

*Note: On Windows, Orion defaults specifically to `NSIS Setup EXE` packaging and skips `MSI` bundles to optimize packaging speed.*

---

### 💾 Windows Packaging (Installer & Portable)

For standard setup installers:
```bash
npm run tauri:installer
```
Outputs the setup installer (`.exe`) inside:
`src-tauri/target/release/bundle/nsis/`

For portable versions:
```bash
npm run tauri:portable
```
Outputs the portable standalone executable (`.exe`) inside:
`src-tauri/target/release/orion-utility-suite.exe`

*Note: The Windows build scripts redirect temporary build files to `.orion-build-temp` in the project root. This ensures stable compilation even when the user system's standard `%TEMP%` partition has restricted disk space.*

---

### 🐧 Linux & macOS Notes

- Ensure GTK/WebKit (Linux) or Xcode Command Line Tools (macOS) are installed prior to compilation.
- Features like ping, subnet scanning, and window position persistence might behave slightly differently across operating systems due to platform permission models.
- **PDF rendering** utilizes native pre-compiled PDFium libraries per architecture/OS. Ensure files inside `src-tauri/resources/pdfium/` are intact during compilation.

---

### 🧩 Optional External Dependencies

Orion runs standalone with zero heavy external runtime dependencies. However, native resources are compiled or integrated inside:
- **PDFium** (for PDF-to-Image rendering)
- **FFmpeg** (reserved for future media workflow features)

---

### 🔒 Known Limitations

- Some desktop actions (such as picking a folder) require read/write file access permissions from the host OS.
- If compiling in heavily sandboxed or virtual environments, Rust compilation might experience file lock issues or permission blocks; compiling on a standard local developer machine is highly recommended.

---

### 📄 License & Credits

- **License**: This project is licensed under the **MIT License**.
- **PDF Crate Credits**:
  - **pdfium-render**: An idiomatic Rust wrapper created by **ajrcarey** to bind native PDFium engines in Rust. Licensed under the **MIT License** ([GitHub Repository](https://github.com/ajrcarey/pdfium-render)).
  - **Google PDFium**: The official C++ rendering engine developed by Google LLC. Licensed under the **BSD 3-Clause License** ([Official PDFium Site](https://pdfium.googlesource.com/pdfium/)).

---

## 🇮🇩 Bahasa Indonesia

Orion Utility Suite adalah aplikasi desktop *cross-platform* all-in-one utility untuk Windows, Linux, dan macOS yang dibangun dengan pendekatan **offline-first**. Seluruh proses backend utama berjalan lokal melalui command Tauri + Rust, tanpa Express, Laravel, atau backend cloud.

### 🚀 Modul & Fitur Aktif

- **Dashboard & Diagnostics**: Tampilan HUD interaktif yang menampilkan info sistem operasi spesifik, arsitektur CPU, IP lokal, status gateway, dan cek keamanan offline.
- **Image Converter**: Pemrosesan konversi dan kompresi gambar (PNG, JPEG, WebP) massal berbasis Rust *multithreading* dengan opsi kustomisasi dimensi—UI tetap responsif selama proses berjalan.
- **PDF Tools**: Perkakas native Rust untuk menggabungkan, memecah, merubah gambar ke PDF, dan merender halaman PDF menjadi file gambar beresolusi tinggi menggunakan engine native Google PDFium.
- **Network Toolkit**: Alat diagnostik lokal lengkap yang mencakup subnet scanner, pemindai sinyal Wi-Fi, pemantau latensi ping, pemindai port, pencarian DNS, dan pengecek status HTTP.
- **Hash Checker**: Pembuatan nilai hash (*MD5, SHA-1, SHA-256, SHA-512*) berkecepatan tinggi dengan teknologi *streaming buffer* lokal di Rust untuk berkas berukuran raksasa.
- **QR Generator**: Membuat kode QR interaktif kustom dengan gaya dan warna khusus.
- **Text & Developer Tools**: Alat pemformatan teks, validasi sandi, kalkulator teks, dan pembantu frontend developer.
- **Persistent Settings**: Preferensi tema (*Light/Dark/System*) dan warna aksen tersimpan otomatis menggunakan *Tauri Store*.

### 🛠️ Stack Utama

- **Tauri v2** (Rust Backend & App Shell)
- **React 19** & **TypeScript** (Frontend Engine)
- **Vite** (Build Tool)
- **Tailwind CSS v4** (Styling Framework)

---

### 📂 Struktur Folder

```text
.
|- src/
|  |- app/
|  |- components/
|  |- data/
|  |- features/
|  |- lib/
|  |- pages/
|  |- services/
|  `- types/
|- src-tauri/
|  |- capabilities/
|  |- icons/
|  `- src/
|- index.html
|- package.json
`- vite.config.ts
```

---

### ⚙️ Prasyarat

Sebelum membangun atau menjalankan proyek, pastikan mesin Anda memenuhi persyaratan berikut:
1. **Node.js** v20 atau lebih baru
2. **Rust Toolchain** (melalui `rustup`)
3. **Tauri v2 Prerequisites** sesuai dengan OS Anda:
   - Referensi resmi: [Tauri v2 Prerequisites Guide](https://v2.tauri.app/start/prerequisites/)
   - Referensi resmi: [Tauri v2 + Vite Quickstart Guide](https://v2.tauri.app/start/frontend/vite/)

---

### 📦 Install

Untuk menginstal dependency frontend dan build:
```bash
npm install
```

---

### 💻 Menjalankan Server Pengembangan

Pratinjau browser standar (tanpa perintah native):
```bash
npm run dev
```

Aplikasi desktop Tauri penuh (React UI terhubung ke native Rust backend):
```bash
npm run tauri dev
```

---

### 🔨 Perintah Kompilasi & Build

Build frontend produksi:
```bash
npm run build
```

Build paket desktop default sesuai OS aktif:
```bash
npm run tauri build
```
Perintah ini akan menyusun aset frontend produksi, mengompilasi backend Rust, dan mengemas installer desktop sesuai sistem operasi Anda.

*Catatan: Di Windows, Orion sekarang default ke `NSIS setup EXE` saja agar mempercepat pemrosesan packaging.*

---

### 💾 Windows Packaging (Installer & Portable)

Untuk installer setup standar:
```bash
npm run tauri:installer
```
Menghasilkan installer (`.exe`) di dalam:
`src-tauri/target/release/bundle/nsis/`

Untuk versi portable:
```bash
npm run tauri:portable
```
Menghasilkan berkas executable portabel mandiri (`.exe`) di dalam:
`src-tauri/target/release/orion-utility-suite.exe`

---

### 🐧 Catatan Linux dan macOS

- Pastikan GTK/WebKit (Linux) atau Xcode Command Line Tools (macOS) sudah terpasang sebelum kompilasi.
- Beberapa modul seperti ping, pemindaian subnet, dan penyimpanan preferensi posisi jendela dapat berperilaku sedikit berbeda tergantung model izin platform OS.
- **PDF rendering** menggunakan pustaka native PDFium per arsitektur/OS. Pastikan file di folder `src-tauri/resources/pdfium/` tidak terhapus selama kompilasi.

---

### 🧩 Dependency Eksternal Opsional

Orion berjalan mandiri tanpa dependency runtime eksternal yang berat. Namun, resource native berikut dipaketkan langsung:
- **PDFium** (untuk rendering PDF-ke-Gambar)
- **FFmpeg** (opsional untuk fitur media di masa depan)

---

### 🔒 Batasan yang Diketahui

- Beberapa tindakan desktop (seperti memilih folder) memerlukan izin akses berkas dari sistem operasi induk.
- Jika dikompilasi dalam lingkungan terisolasi atau virtual, kompilasi Rust dapat mengalami masalah izin menulis berkas; sangat disarankan untuk melakukan kompilasi langsung di mesin lokal pengembang.

---

### 📄 Lisensi & Credit

- **Lisensi**: Proyek ini dilisensikan di bawah lisensi **MIT**.
- **Credit Crate PDF**:
  - **pdfium-render**: Wrapper Rust idiomatic yang dibuat oleh **ajrcarey** untuk menghubungkan engine PDFium. Dilisensikan di bawah lisensi **MIT** ([Repositori GitHub](https://github.com/ajrcarey/pdfium-render)).
  - **Google PDFium**: Engine rendering C++ asli bawaan dari Google. Dilisensikan di bawah lisensi **BSD 3-Clause** ([Situs Resmi PDFium](https://pdfium.googlesource.com/pdfium/)).
