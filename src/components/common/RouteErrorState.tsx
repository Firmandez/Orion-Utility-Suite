import { AlertTriangle, Home, RotateCcw } from "lucide-react";
import { isRouteErrorResponse, useRouteError } from "react-router-dom";
import { Button } from "@/components/ui/Button";

function getErrorDetails(error: unknown) {
  if (isRouteErrorResponse(error)) {
    return {
      title: `${error.status} ${error.statusText || "Route error"}`,
      description:
        typeof error.data === "string"
          ? error.data
          : "Terjadi masalah saat memuat halaman yang diminta.",
    };
  }

  if (error instanceof Error) {
    return {
      title: "Module failed to render",
      description: error.message,
    };
  }

  return {
    title: "Unexpected application error",
    description: "Orion menemukan masalah saat merender halaman ini.",
  };
}

export function RouteErrorState() {
  const error = useRouteError();
  const details = getErrorDetails(error);

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-8">
      <div className="surface-panel w-full max-w-2xl p-6 sm:p-8">
        <div className="flex size-16 items-center justify-center rounded-3xl bg-rose-500/10 text-rose-300">
          <AlertTriangle className="size-7" />
        </div>
        <div className="mt-6">
          <div className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">Route error</div>
          <h1 className="mt-3 text-3xl font-semibold text-[var(--text-primary)]">{details.title}</h1>
          <p className="mt-3 max-w-xl text-sm leading-7 text-[var(--text-secondary)]">{details.description}</p>
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button leadingIcon={Home} onClick={() => window.location.assign(`${window.location.pathname}#/`)}>
            Back to dashboard
          </Button>
          <Button variant="outline" leadingIcon={RotateCcw} onClick={() => window.location.reload()}>
            Reload app
          </Button>
        </div>
      </div>
    </div>
  );
}
