import type { Metadata } from "next";
import { OverviewWorkspace } from "@/src/components/painel/OverviewWorkspace";

export const metadata: Metadata = {
  title: "Visão geral",
  robots: { index: false, follow: false },
};

export default function PainelOverviewPage() {
  return <OverviewWorkspace />;
}
