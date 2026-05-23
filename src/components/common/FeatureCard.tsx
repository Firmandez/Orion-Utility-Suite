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
    <motion.div whileHover={{ y: -4 }} whileTap={{ scale: 0.995 }}>
      <Link
        to={feature.path}
        className="group surface-panel-alt relative flex h-full flex-col overflow-hidden p-5 transition duration-200 hover:border-[var(--accent-soft)]"
      >
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-br opacity-0 transition duration-300 group-hover:opacity-100"
          style={{
            backgroundImage: "linear-gradient(145deg, var(--accent-surface) 0%, transparent 78%)",
          }}
        />
        <div className="relative flex items-start justify-between gap-4">
          <div className="flex size-12 items-center justify-center rounded-2xl border border-[var(--accent-soft)] bg-[var(--accent-surface)] text-[var(--accent-strong)]">
            <Icon className="size-5" />
          </div>
          <span className="rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-[var(--text-muted)]">
            {feature.status}
          </span>
        </div>
        <div className="relative mt-5">
          <h3 className="text-lg font-semibold text-[var(--text-primary)]">{feature.title}</h3>
          <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{feature.description}</p>
        </div>
        <div className="relative mt-5 flex items-center justify-between gap-3">
          <span className="text-xs uppercase tracking-[0.16em] text-[var(--text-muted)]">{feature.category}</span>
          <span className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--accent-strong)]">
            Open
            <ArrowRight className="size-4 transition group-hover:translate-x-0.5" />
          </span>
        </div>
      </Link>
    </motion.div>
  );
}
