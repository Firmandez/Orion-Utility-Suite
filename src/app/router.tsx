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
          <div className="mt-3 text-xl font-semibold text-[var(--text-primary)]">Preparing Orion workspace...</div>
          <div className="mt-2 text-sm text-[var(--text-secondary)]">
            Route ini dipecah secara lazy agar shell aplikasi tetap ringan saat startup.
          </div>
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
          "Overview pondasi project, status runtime, dan modul utilitas yang siap dikembangkan.",
          "Search modules, categories, or descriptions",
        ),
      },
      {
        path: "qr-generator",
        element: withSuspense(<QRGeneratorPage />),
        handle: handle(
          "QR Generator",
          "Generator QR offline dengan preset siap pakai, live preview, logo tengah, dan export lokal.",
          "Search QR presets or payload ideas",
        ),
      },
      {
        path: "image-converter",
        element: withSuspense(<ImageConverterPage />),
        handle: handle(
          "Image Converter",
          "Batch image conversion berbasis Rust async dengan multi-file queue, resize opsional, output folder native, dan hasil per-file.",
          "Search image workflows or format presets",
        ),
      },
      {
        path: "pdf-tools",
        element: withSuspense(<PDFToolsPage />),
        handle: handle(
          "PDF Tools",
          "Workspace PDF berbasis Rust untuk merge, split, image-to-PDF, dan placeholder rapi menuju PDF to Image.",
          "Search PDF operations, merge queues, or document workflows",
        ),
      },
      {
        path: "text-utilities",
        element: withSuspense(<TextUtilitiesPage />),
        handle: handle(
          "Text Utilities",
          "Workspace teks dua panel untuk JSON, Base64, URL tools, slugify, dan counter lokal.",
          "Search transforms, encoders, or payload text",
        ),
      },
      {
        path: "hash-checker",
        element: withSuspense(<HashCheckerPage />),
        handle: handle(
          "Hash Checker",
          "Hash checker file berbasis Rust streaming dengan MD5, SHA1, SHA256, compare state, dan progress real-time.",
          "Search hash modes or checksum workflows",
        ),
      },
      {
        path: "network-toolkit",
        element: withSuspense(<NetworkToolkitPage />),
        handle: handle(
          "Network Toolkit",
          "Toolkit jaringan berbasis Rust untuk local IP, DNS lookup, ping host, port checker, dan HTTP status dengan hasil yang mudah dibaca.",
          "Search hostnames, diagnostics, or network notes",
        ),
      },
      {
        path: "developer-tools",
        element: withSuspense(<DeveloperToolsPage />),
        handle: handle(
          "Developer Tools",
          "Workspace utilitas developer untuk formatter, payload helper, dan command scaffolds.",
          "Search payload helpers or dev tools",
        ),
      },
      {
        path: "settings",
        element: withSuspense(<SettingsPage />),
        handle: handle(
          "Settings",
          "Kelola settings persistent, accent color, output defaults, dan kesiapan build desktop Orion.",
          "Search preferences and settings",
        ),
      },
    ],
  },
]);
