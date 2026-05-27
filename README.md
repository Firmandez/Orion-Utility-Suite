# Orion Utility Suite

Orion Utility Suite adalah aplikasi desktop cross-platform all-in-one utility untuk Windows, Linux, dan macOS yang dibangun dengan pendekatan offline-first. Seluruh proses backend utama berjalan lokal melalui command Tauri + Rust, tanpa Express, Laravel, atau backend cloud.

Tahap yang sudah aktif saat ini:

- Dashboard + system info
- QR Generator
- Text Utilities
- Hash Checker berbasis Rust streaming
- Image Converter berbasis Rust batch async
- Network Toolkit berbasis Rust
- PDF Tools dasar berbasis Rust
- Developer Tools frontend-only
- Settings persistent berbasis Tauri Store

## Stack

- Tauri v2
- React 19
- TypeScript
- Rust
- Vite
- Tailwind CSS v4

## Struktur Folder

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

## Prasyarat

1. Node.js 20+ atau lebih baru
2. Rust toolchain melalui `rustup`
3. Tauri prerequisites sesuai OS

Referensi resmi:

- [Tauri v2 prerequisites](https://v2.tauri.app/start/prerequisites/)
- [Tauri v2 + Vite guide](https://v2.tauri.app/start/frontend/vite/)

## Install

```bash
npm install
```

## Run Dev

Frontend browser preview:

```bash
npm run dev
```

Desktop app Tauri:

```bash
npm run tauri dev
```

## Build Frontend

```bash
npm run build
```

## Build Desktop App

Build default bundle Tauri:

```bash
npm run tauri build
```

Perintah ini akan menjalankan:

- build frontend production
- compile backend Rust
- generate bundle installer desktop sesuai target OS

Catatan:

- Di Windows, Orion sekarang default ke `NSIS setup EXE` saja agar tidak ikut mencoba `MSI`.
- Di Linux/macOS, Tauri tetap memakai target bundle default platform masing-masing.

## Build Windows Installer

Di Windows, `npm run tauri build` atau perintah yang lebih eksplisit:

```bash
npm run tauri:installer
```

akan menghasilkan installer:

- `NSIS setup EXE`

Script ini memakai temporary build directory lokal workspace pada Windows agar tidak terlalu bergantung pada `%TEMP%` user profile saat drive sistem atau drive home sedang sempit.
Script ini juga membersihkan folder bundle release lama sebelum packaging baru dimulai agar output installer tetap rapi.

Lokasi output biasanya:

```text
src-tauri/target/release/bundle/nsis/
```

Jika Anda ingin binary portable tanpa installer:

```bash
npm run tauri:portable
```

Binary hasil release biasanya ada di:

```text
src-tauri/target/release/orion-utility-suite.exe
```

## Release Preparation

Untuk packaging final MVP, workflow yang disarankan:

```bash
npm run build
cargo check --manifest-path src-tauri/Cargo.toml
cargo build --manifest-path src-tauri/Cargo.toml --release
npm run tauri build
```

Output Windows yang relevan:

- Installer EXE: `src-tauri/target/release/bundle/nsis/`
- Portable EXE: `src-tauri/target/release/orion-utility-suite.exe`

Metadata rilis utama:

- Product name: `Orion Utility Suite`
- Identifier: `com.firmandez.orionutilitysuite`
- Author / publisher profile: [Firmandez](https://github.com/Firmandez)
- License: `MIT`
- Changelog: [CHANGELOG.md](./CHANGELOG.md)

## Catatan Linux dan macOS

- Pastikan prerequisite Tauri untuk GTK/WebKit/Linux atau Xcode/macOS sudah terpenuhi sebelum `tauri dev` atau `tauri build`.
- Beberapa tool seperti `ping`, permission akses folder, dan behavior window state bisa sedikit berbeda antar OS.
- `PDF to Image` memakai bundled PDFium native per OS/arsitektur. Pastikan resource `src-tauri/resources/pdfium` ikut tersedia saat build lintas platform.

## Dependency Eksternal Opsional

Orion saat ini sudah berjalan tanpa dependency eksternal berat untuk sebagian besar fitur aktif. Resource native berikut dipaketkan atau bisa relevan untuk tahap pengembangan lanjut:

- `PDFium` untuk render `PDF to Image`
- `FFmpeg` bila nanti ditambahkan media workflow lanjutan
- `ImageMagick` untuk eksperimen pipeline image eksternal
- `Poppler` atau `Tesseract` bila nanti ditambahkan ekstraksi/ocr dokumen

## Catatan Build dan Runtime

- Settings persistent disimpan ke `settings.json` melalui plugin resmi Tauri Store di app data directory.
- Sumber versi utama ada di `package.json`. Jalankan `npm run sync:version` jika Anda mengubah versi secara manual agar `src-tauri/Cargo.toml`, `src-tauri/tauri.conf.json`, `package-lock.json`, dan fallback frontend ikut sinkron.
- Browser preview tetap bisa dipakai untuk pengembangan UI, tetapi persistence native, file picker desktop, dan command Rust penuh hanya tersedia saat berjalan sebagai aplikasi Tauri desktop.
- Hash Checker, Image Converter, PDF Tools, dan Network Toolkit dirancang agar UI tetap responsif melalui async processing atau worker blocking terpisah di backend Rust.
- Di Windows, `npm run tauri build` dan script packaging terkait memakai wrapper lokal agar temporary build files diarahkan ke workspace `.orion-build-temp` saat diperlukan.

## Known Limitations

- `PDF to Image` membutuhkan bundled PDFium yang cocok dengan OS/arsitektur target.
- Beberapa workflow desktop memerlukan izin akses file/folder dari OS target.
- Verifikasi build Rust di environment sandbox tertentu bisa gagal karena pembatasan write permission atau fetch dependency, walaupun project dapat tetap dibangun normal di mesin developer lokal.
