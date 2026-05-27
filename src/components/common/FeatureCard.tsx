import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import type { ToolDefinition } from "@/types/app";

interface FeatureCardProps {
  feature: ToolDefinition;
}

export function FeatureCard({ feature }: FeatureCardProps) {
  const Icon = feature.icon;

  return (
    <motion.div whileHover={{ y: -3 }} whileTap={{ scale: 0.995 }}>
      <Link
        to={feature.path}
        className="group surface-panel-alt relative flex h-full flex-col overflow-hidden p-4 transition duration-200 hover:border-[var(--accent-soft)]"
      >
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-br opacity-0 transition duration-300 group-hover:opacity-100"
          style={{
            backgroundImage: "linear-gradient(145deg, var(--accent-surface) 0%, transparent 78%)",
          }}
        />
        <div className="relative flex items-start gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl border border-[var(--accent-soft)] bg-[var(--accent-surface)] text-[var(--accent-strong)]">
            <Icon className="size-4" />
          </div>
        </div>
        <div className="relative mt-4">
          <h3 className="text-base font-semibold text-[var(--text-primary)]">{feature.title}</h3>
          <p className="mt-1.5 text-sm leading-5 text-[var(--text-secondary)]">{feature.description}</p>
        </div>
        <div className="relative mt-auto flex items-center gap-2 pt-3 text-sm font-medium text-[var(--accent-strong)] opacity-0 transition group-hover:opacity-100">
          Open <ArrowRight className="size-4 transition group-hover:translate-x-0.5" />
        </div>
      </Link>
    </motion.div>
  );
}
