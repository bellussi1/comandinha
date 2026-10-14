import type { Metadata } from "next";
import { TablesWorkspace } from "@/src/components/painel/mesas/TablesWorkspace";

export const metadata: Metadata = {
  title: "Mesas",
  robots: { index: false, follow: false },
};

export default function TablesPage() {
  return <TablesWorkspace />;
}
