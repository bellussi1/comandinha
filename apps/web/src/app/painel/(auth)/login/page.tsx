import type { Metadata } from "next";
import { ArrowUpRight, UtensilsCrossed } from "lucide-react";
import Link from "next/link";
import { PainelLoginForm } from "@/src/components/painel/PainelLoginForm";

export const metadata: Metadata = {
  title: "Entrar no painel",
  robots: { index: false, follow: false },
};

export default function PainelLoginPage() {
  return (
    <main className="painel-login-page">
      <section
        className="painel-login-story"
        aria-label="Comandinha para restaurantes"
      >
        <Link className="painel-login-brand" href="/">
          <span className="painel-brand-mark" aria-hidden="true">
            <UtensilsCrossed size={19} />
          </span>
          comandinha
        </Link>
        <div className="painel-login-story-copy">
          <span className="painel-eyebrow">
            ROTINA MAIS LEVE, SERVIÇO MELHOR
          </span>
          <h1>O salão em ordem começa por aqui.</h1>
          <p>Pedidos, equipe e operação no mesmo ritmo da sua casa.</p>
        </div>
        <div className="painel-login-story-footer">
          <span className="painel-coral-mark" aria-hidden="true" />
          <span>Feito para quem faz acontecer.</span>
        </div>
        <span className="painel-story-index" aria-hidden="true">
          01 / 03
        </span>
      </section>

      <section className="painel-login-panel">
        <div className="painel-login-panel-top">
          <span>Acesso da equipe</span>
          <Link href="/admin/login">
            Painel anterior <ArrowUpRight aria-hidden="true" size={15} />
          </Link>
        </div>
        <div className="painel-login-card">
          <span className="painel-eyebrow">BEM-VINDO DE VOLTA</span>
          <h2>Entre na sua conta</h2>
          <p>Use as credenciais vinculadas ao seu restaurante.</p>
          <PainelLoginForm />
        </div>
        <p className="painel-login-legal">Acesso protegido · Comandinha</p>
      </section>
    </main>
  );
}
