import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, LayoutGrid } from "lucide-react";

export const metadata: Metadata = {
  title: "Visão geral",
  robots: { index: false, follow: false },
};

export default function PainelOverviewPage() {
  return (
    <section className="painel-overview">
      <div className="painel-page-heading">
        <span className="painel-eyebrow">SEU ESPAÇO DE TRABALHO</span>
        <h1>Visão geral</h1>
        <p>Uma operação bem organizada começa por um catálogo claro.</p>
      </div>
      <Link className="painel-overview-card" href="/painel/catalogo">
        <span className="painel-overview-icon">
          <LayoutGrid aria-hidden="true" size={22} />
        </span>
        <span className="painel-overview-copy">
          <strong>Organize seu catálogo</strong>
          <span>Cadastre categorias e produtos para sua equipe.</span>
        </span>
        <ArrowRight aria-hidden="true" size={19} />
      </Link>
      <p className="painel-transition-note">
        O painel anterior continua disponível enquanto cada área é migrada.
      </p>
    </section>
  );
}
