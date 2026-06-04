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
    <motion.div whileHover={{ y: -2 }} whileTap={{ scale: 0.995 }}>
      <Link
        to={feature.path}
        className="group surface-panel-alt relative flex h-full min-h-[128px] flex-col overflow-hidden p-3 transition duration-200 hover:border-(--accent-soft)"
      >
        <div
          className="pointer-events-none absolute inset-0 bg-linear-to-br opacity-0 transition duration-300 group-hover:opacity-100"
          style={{
            backgroundImage: "linear-gradient(145deg, var(--accent-surface) 0%, transparent 78%)",
          }}
        />
        <div className="relative flex items-start gap-3">
          <div className="flex size-8 items-center justify-center rounded-lg border border-(--accent-soft) bg-(--accent-surface) text-(--accent-strong)">
            <Icon className="size-4" />
          </div>
        </div>
        <div className="relative mt-3">
          <h3 className="text-[15px] font-semibold text-(--text-primary)">{feature.title}</h3>
          <p className="mt-1 line-clamp-2 text-xs leading-4 text-(--text-secondary)">{feature.description}</p>
        </div>
        <div className="relative mt-auto flex items-center gap-1.5 pt-2 text-xs font-semibold text-(--accent-strong) opacity-0 transition group-hover:opacity-100">
          Open <ArrowRight className="size-3.5 transition group-hover:translate-x-0.5" />
        </div>
      </Link>
    </motion.div>
  );
}
