import { startTransition, useEffect, useState } from "react";
import { fallbackBootstrap, getAppBootstrap } from "@/lib/tauri";
import type { AppBootstrapState } from "@/types/app";

const initialState: AppBootstrapState = {
  status: "loading",
  source: "mock",
  data: fallbackBootstrap,
};

export function useAppBootstrap() {
  const [bootstrap, setBootstrap] = useState<AppBootstrapState>(initialState);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const payload = await getAppBootstrap();

        if (!active) {
          return;
        }

        startTransition(() => {
          setBootstrap({
            status: "ready",
            source: "rust",
            data: payload,
          });
        });
      } catch (error) {
        console.warn("Orion bootstrap fallback activated:", error);

        if (!active) {
          return;
        }

        startTransition(() => {
          setBootstrap({
            status: "ready",
            source: "mock",
            data: fallbackBootstrap,
            errorMessage: "Rust bridge belum aktif di preview browser ini.",
          });
        });
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, []);

  return bootstrap;
}
