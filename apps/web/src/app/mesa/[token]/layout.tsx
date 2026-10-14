import { ChamadoProvider } from "@/src/contexts/ChamadoContext";
import type React from "react";

export default function MesaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ChamadoProvider>{children}</ChamadoProvider>;
}
