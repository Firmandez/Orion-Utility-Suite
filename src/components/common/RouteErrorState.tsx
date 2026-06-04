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
      <div className="surface-panel w-full max-w-xl p-4 sm:p-5">
        <div className="flex size-10 items-center justify-center rounded-xl bg-rose-500/10 text-rose-300">
          <AlertTriangle className="size-4" />
        </div>
        <div className="mt-4">
          <div className="text-xs uppercase tracking-widest text-(--text-muted)">Page Error</div>
          <h1 className="mt-2 text-2xl font-semibold text-(--text-primary)">{details.title}</h1>
          <p className="mt-2 max-w-xl text-sm leading-5 text-(--text-secondary)">{details.description}</p>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
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
