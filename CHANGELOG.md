# Changelog

All notable changes to Orion Utility Suite will be documented in this file.

The format is inspired by Keep a Changelog and this project currently uses semantic versioning.

## [0.2.0] - 2026-05-23

### Added

- Modern desktop shell with routing, sidebar navigation, header, and dark-mode-first layout
- Dashboard with system info, local IP, utility search, and category filters
- QR Generator with presets, live preview, logo overlay, validation, and PNG/SVG export
- Text Utilities for JSON, Base64, URL encoding, text transforms, and counters
- Hash Checker with Rust streaming digest generation and compare state
- Image Converter with Rust batch conversion, output folder selection, and progress handling
- Network Toolkit with Rust-based local IP, DNS lookup, ping, port checker, and HTTP status checker
- PDF Tools with merge, split, image-to-PDF, and placeholder-safe PDF-to-image flow
- Developer Tools with UUID, timestamp, regex, JWT decode, and color conversion
- Persistent Settings powered by the official Tauri Store plugin
- Windows-focused packaging scripts for NSIS installer and portable EXE workflows

### Changed

- Unified version management around `package.json` with sync automation to Tauri and frontend fallback files
- Updated application icons to the custom Orion logo asset
- Refined sidebar branding, accent handling, and release metadata for MVP packaging
- Switched default Windows bundling away from MSI toward NSIS-only release output
- Cleaned up Windows release packaging flow so stale installer artifacts do not accumulate across builds

### Fixed

- QR Generator startup crash caused by incomplete `imageOptions` defaults
- Repeating local IP/system info refresh loops in dashboard and network toolkit
- Release build console window appearing on Windows
- Toggle switch layout shrinking incorrectly in constrained cards
- Windows build temp handling for portable and NSIS packaging workflows
