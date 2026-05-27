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

function handle(title: string, searchPlaceholder: string, subtitle?: string): RouteHandle {
  return { title, subtitle, searchPlaceholder };
}

function withSuspense(node: ReactNode) {
  return (
    <Suspense
      fallback={
        <div className="surface-panel p-5">
          <div className="text-xs uppercase tracking-[0.08em] text-[var(--text-muted)]">Loading module</div>
          <div className="mt-2 text-lg font-semibold text-[var(--text-primary)]">Preparing Orion...</div>
          <div className="mt-1.5 text-sm text-[var(--text-secondary)]">Just a moment, the page is loading.</div>
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
          "Search utilities",
          "Quick access to every desktop utility.",
        ),
      },
      {
        path: "qr-generator",
        element: withSuspense(<QRGeneratorPage />),
        handle: handle(
          "QR Generator",
          "Search QR presets or options",
          "Create QR codes for URLs, text, Wi-Fi, WhatsApp, email, and contacts.",
        ),
      },
      {
        path: "image-converter",
        element: withSuspense(<ImageConverterPage />),
        handle: handle(
          "Image Converter",
          "Search image formats or workflows",
          "Convert images in batches with format, quality, and output folder controls.",
        ),
      },
      {
        path: "pdf-tools",
        element: withSuspense(<PDFToolsPage />),
        handle: handle(
          "PDF Tools",
          "Search PDF operations",
          "Merge, split, and create PDFs from local images.",
        ),
      },
      {
        path: "text-utilities",
        element: withSuspense(<TextUtilitiesPage />),
        handle: handle(
          "Text Utilities",
          "Search text tools",
          "Format, encode, decode, and clean up text with input-output panels.",
        ),
      },
      {
        path: "hash-checker",
        element: withSuspense(<HashCheckerPage />),
        handle: handle(
          "Hash Checker",
          "Search hashes or checksums",
          "Verify file integrity with MD5, SHA1, and SHA256.",
        ),
      },
      {
        path: "network-toolkit",
        element: withSuspense(<NetworkToolkitPage />),
        handle: handle(
          "Network Toolkit",
          "Search hosts or network tools",
          "Check local IP, DNS, ping, ports, and HTTP status.",
        ),
      },
      {
        path: "developer-tools",
        element: withSuspense(<DeveloperToolsPage />),
        handle: handle(
          "Advanced Tools",
          "Search advanced tools",
          "Tools for UUIDs, timestamps, regex, JWTs, and color conversion.",
        ),
      },
      {
        path: "settings",
        element: withSuspense(<SettingsPage />),
        handle: handle(
          "Settings",
          "Search settings",
          "Customize appearance, output folders, and app preferences.",
        ),
      },
    ],
  },
]);
