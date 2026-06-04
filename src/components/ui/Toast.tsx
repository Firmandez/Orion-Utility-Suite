import { Toaster, toast } from "sonner";
import { useShell } from "@/app/providers/ShellProvider";

export const notify = {
  success: (title: string, description?: string) => toast.success(title, { description }),
  info: (title: string, description?: string) => toast.info(title, { description }),
  error: (title: string, description?: string) => toast.error(title, { description }),
};

export function Toast() {
  const { resolvedTheme } = useShell();

  return (
    <Toaster
      closeButton
      richColors
      position="top-right"
      theme={resolvedTheme}
      toastOptions={{
        classNames: {
          toast: "!rounded-xl !border !shadow-2xl",
          title: "!text-sm !font-semibold",
          description: "!text-xs",
        },
      }}
    />
  );
}
