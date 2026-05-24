import type { LucideIcon } from "lucide-react";

export interface RouteHandle {
  title: string;
  subtitle?: string;
  searchPlaceholder?: string;
}

export interface NavItem {
  title: string;
  to: string;
  icon: LucideIcon;
  description?: string;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}
