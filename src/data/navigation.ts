import { LayoutDashboard } from "lucide-react";
import { settingsTool, toolCatalog } from "@/data/toolCatalog";
import type { NavGroup } from "@/types/navigation";

export const navGroups: NavGroup[] = [
  {
    label: "Workspace",
    items: [
      {
        title: "Dashboard",
        to: "/",
        icon: LayoutDashboard,
        description: "Overview pondasi aplikasi dan modul aktif.",
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
    label: "System",
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
