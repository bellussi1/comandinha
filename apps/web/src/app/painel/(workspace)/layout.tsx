import type { Metadata } from "next";
import { PainelSessionGate } from "@/src/components/painel/PainelSessionGate";

export const metadata: Metadata = {
  title: "Painel de gestão",
  robots: { index: false, follow: false },
};

export default function PainelWorkspaceLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <PainelSessionGate>{children}</PainelSessionGate>;
}
