import { Suspense, lazy, type ReactNode } from "react";
import { createHashRouter } from "react-router-dom";
import { RouteErrorState } from "@/components/common/RouteErrorState";
import { AppLayout } from "@/components/layout/AppLayout";
import type { RouteHandle } from "@/types/navigation";

const DashboardPage = lazy(() => import("@/pages/DashboardPage"));
const QRGeneratorPage = lazy(() => import("@/pages/QRGeneratorPage"));
const ImageConverterPage = lazy(() => import("@/pages/ImageConverterPage"));
const PDFToolsPage = lazy(() => import("@/pages/PDFToolsPage"));
const TextUtilitiesPage = lazy(() => import("@/pages/TextUtilitiesPage"));
const HashCheckerPage = lazy(() => import("@/pages/HashCheckerPage"));
const NetworkToolkitPage = lazy(() => import("@/pages/NetworkToolkitPage"));
const DeveloperToolsPage = lazy(() => import("@/pages/DeveloperToolsPage"));
const SettingsPage = lazy(() => import("@/pages/SettingsPage"));

function handle(title: string, subtitle: string, searchPlaceholder: string): RouteHandle {
  return { title, subtitle, searchPlaceholder };
}

function withSuspense(node: ReactNode) {
  return (
    <Suspense
      fallback={
        <div className="surface-panel p-6">
          <div className="text-sm uppercase tracking-[0.16em] text-[var(--text-muted)]">Loading module</div>
          <div className="mt-3 text-xl font-semibold text-[var(--text-primary)]">Menyiapkan Orion...</div>
          <div className="mt-2 text-sm text-[var(--text-secondary)]">Sebentar, modul sedang dibuka.</div>
        </div>
      }
    >
      {node}
    </Suspense>
  );
}

export const router = createHashRouter([
  {
    path: "/",
    element: <AppLayout />,
    errorElement: <RouteErrorState />,
    children: [
      {
        index: true,
        element: withSuspense(<DashboardPage />),
        handle: handle(
          "Dashboard",
          "Akses cepat ke utility utama dan informasi aplikasi.",
          "Cari utility, kategori, atau fungsi",
        ),
      },
      {
        path: "qr-generator",
        element: withSuspense(<QRGeneratorPage />),
        handle: handle(
          "QR Generator",
          "Buat QR untuk URL, teks, Wi-Fi, WhatsApp, email, dan kontak.",
          "Cari preset QR",
        ),
      },
      {
        path: "image-converter",
        element: withSuspense(<ImageConverterPage />),
        handle: handle(
          "Image Converter",
          "Ubah banyak gambar sekaligus dengan pilihan resize, kualitas, dan folder output.",
          "Cari format atau alur gambar",
        ),
      },
      {
        path: "pdf-tools",
        element: withSuspense(<PDFToolsPage />),
        handle: handle(
          "PDF Tools",
          "Gabungkan, pisahkan, dan buat PDF dari gambar lokal.",
          "Cari operasi PDF",
        ),
      },
      {
        path: "text-utilities",
        element: withSuspense(<TextUtilitiesPage />),
        handle: handle(
          "Text Utilities",
          "Format, encode, decode, dan rapikan teks dengan panel input-output.",
          "Cari alat teks",
        ),
      },
      {
        path: "hash-checker",
        element: withSuspense(<HashCheckerPage />),
        handle: handle(
          "Hash Checker",
          "Cek integritas file dengan MD5, SHA1, dan SHA256.",
          "Cari hash atau checksum",
        ),
      },
      {
        path: "network-toolkit",
        element: withSuspense(<NetworkToolkitPage />),
        handle: handle(
          "Network Toolkit",
          "Periksa IP lokal, DNS, ping, port, dan status HTTP.",
          "Cari host atau catatan jaringan",
        ),
      },
      {
        path: "developer-tools",
        element: withSuspense(<DeveloperToolsPage />),
        handle: handle(
          "Advanced Tools",
          "Alat lanjutan untuk UUID, timestamp, regex, JWT, dan warna.",
          "Cari alat lanjutan",
        ),
      },
      {
        path: "settings",
        element: withSuspense(<SettingsPage />),
        handle: handle(
          "Settings",
          "Atur tampilan, folder output, aplikasi, dan informasi Orion.",
          "Cari pengaturan",
        ),
      },
    ],
  },
]);
