import { LayoutDashboard } from "lucide-react";
import { settingsTool, toolCatalog } from "@/data/toolCatalog";
import type { NavGroup } from "@/types/navigation";

export const navGroups: NavGroup[] = [
  {
    label: "Utilities",
    items: [
      {
        title: "Dashboard",
        to: "/",
        icon: LayoutDashboard,
        description: "Quick access to every tool.",
      },
      ...toolCatalog.map((tool) => ({
        title: tool.title,
        to: tool.path,
        icon: tool.icon,
        description: tool.description,
      })),
    ],
  },
  {
    label: "App",
    items: [
      {
        title: settingsTool.title,
        to: settingsTool.path,
        icon: settingsTool.icon,
        description: settingsTool.description,
      },
    ],
  },
];
