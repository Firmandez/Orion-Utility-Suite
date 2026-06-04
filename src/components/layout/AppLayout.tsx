import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { useAppBootstrap } from "@/hooks/useAppBootstrap";
import { AppHeader } from "@/components/layout/AppHeader";
import { AppSidebar } from "@/components/layout/AppSidebar";

export function AppLayout() {
  const bootstrap = useAppBootstrap();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-(--app-bg) text-(--text-primary)">
      <div className="pointer-events-none fixed inset-0 app-shell-grid opacity-35" />
      <div className="relative flex min-h-screen">
        <AppSidebar bootstrap={bootstrap} open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        {sidebarOpen ? (
          <button
            type="button"
            className="fixed inset-0 z-30 bg-slate-950/60 backdrop-blur-sm lg:hidden"
            aria-label="Close sidebar overlay"
            onClick={() => setSidebarOpen(false)}
          />
        ) : null}
        <div className="relative z-10 flex min-h-screen min-w-0 flex-1 flex-col">
          <AppHeader bootstrap={bootstrap} onOpenSidebar={() => setSidebarOpen(true)} />
          <main className="min-w-0 flex-1 px-3.5 py-3.5 sm:px-4 lg:px-5 lg:py-4">
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.22, ease: "easeOut" }}
              >
                <Outlet context={bootstrap} />
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
      </div>
    </div>
  );
}
