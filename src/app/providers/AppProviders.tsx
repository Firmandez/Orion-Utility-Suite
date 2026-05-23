import type { ReactNode } from "react";
import { ShellProvider } from "@/app/providers/ShellProvider";
import { Toast } from "@/components/ui/Toast";

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ShellProvider>
      {children}
      <Toast />
    </ShellProvider>
  );
}
