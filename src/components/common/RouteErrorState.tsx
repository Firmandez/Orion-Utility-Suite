import { AlertTriangle, Home, RotateCcw } from "lucide-react";
import { isRouteErrorResponse, useRouteError } from "react-router-dom";
import { Button } from "@/components/ui/Button";

function getErrorDetails(error: unknown) {
  if (isRouteErrorResponse(error)) {
    return {
        title: `${error.status} ${error.statusText || "Page error"}`,
      description:
        typeof error.data === "string"
          ? error.data
          : "The requested page could not be loaded.",
    };
  }

  if (error instanceof Error) {
    return {
      title: "Module failed to render",
      description: error.message,
    };
  }

  return {
    title: "Something went wrong",
    description: "Orion ran into a problem while rendering this page.",
  };
}

export function RouteErrorState() {
  const error = useRouteError();
  const details = getErrorDetails(error);

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-8">
      <div className="surface-panel w-full max-w-2xl p-5 sm:p-6">
        <div className="flex size-12 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-300">
          <AlertTriangle className="size-5" />
        </div>
        <div className="mt-6">
          <div className="text-xs uppercase tracking-widest text-(--text-muted)">Page Error</div>
          <h1 className="mt-3 text-3xl font-semibold text-(--text-primary)">{details.title}</h1>
          <p className="mt-3 max-w-xl text-sm leading-7 text-(--text-secondary)">{details.description}</p>
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
