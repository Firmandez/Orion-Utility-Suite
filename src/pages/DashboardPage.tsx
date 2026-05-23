import { useOutletContext } from "react-router-dom";
import { DashboardOverview } from "@/features/dashboard/DashboardOverview";
import type { AppBootstrapState } from "@/types/app";

export default function DashboardPage() {
  const bootstrap = useOutletContext<AppBootstrapState>();

  return <DashboardOverview bootstrap={bootstrap} />;
}
