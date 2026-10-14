import type { Metadata } from "next";
import { CatalogWorkspace } from "@/src/components/painel/catalogo/CatalogWorkspace";

export const metadata: Metadata = {
  title: "Catálogo",
  robots: { index: false, follow: false },
};

export default function CatalogPage() {
  return <CatalogWorkspace />;
}
