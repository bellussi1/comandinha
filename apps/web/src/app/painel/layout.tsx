import type { Metadata } from "next";
import "./painel.css";

export const metadata: Metadata = {
  title: { default: "Painel | Comandinha", template: "%s | Comandinha" },
  description: "Área administrativa do Comandinha.",
  robots: { index: false, follow: false },
};

export default function PainelLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <div className="painel-root">{children}</div>;
}
