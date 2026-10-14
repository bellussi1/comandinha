"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Armchair,
  CircleAlert,
  Clock3,
  CookingPot,
  LayoutGrid,
  LoaderCircle,
  PackageCheck,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { usePainelSession } from "./PainelSessionContext";
import { listTables } from "@/src/services/panel-tables";
import { getOrderSummary, type PanelOrderSummary } from "@/src/services/panel-orders";

type OverviewData = { activeTableCount: number; orders: PanelOrderSummary };

function messageFor(error: unknown): string {
  return error instanceof Error && error.message
    ? error.message
    : "Não foi possível atualizar a visão geral.";
}

export function OverviewWorkspace() {
  const session = usePainelSession();
  const [data, setData] = useState<OverviewData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadOverview() {
    setIsLoading(true);
    setError(null);
    try {
      const [tables, orders] = await Promise.all([listTables(), getOrderSummary()]);
      setData({ activeTableCount: tables.filter((table) => table.isActive).length, orders });
    } catch (cause) {
      setError(messageFor(cause));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    void Promise.all([listTables(), getOrderSummary()])
      .then(([tables, orders]) => {
        if (active) {
          setData({ activeTableCount: tables.filter((table) => table.isActive).length, orders });
          setError(null);
        }
      })
      .catch((cause: unknown) => {
        if (active) setError(messageFor(cause));
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const metrics = data
    ? [
        { label: "Mesas ativas", value: data.activeTableCount, icon: Armchair, tone: "coral" },
        { label: "Aguardando", value: data.orders.PENDING, icon: Clock3, tone: "amber" },
        { label: "Em preparo", value: data.orders.PREPARING, icon: CookingPot, tone: "plum" },
        { label: "Prontos", value: data.orders.READY, icon: PackageCheck, tone: "green" },
      ]
    : [];

  return (
    <section aria-busy={isLoading} className="painel-overview painel-dashboard">
      <div className="painel-dashboard-intro">
        <div className="painel-page-heading">
          <span className="painel-eyebrow">{session.restaurant.name.toLocaleUpperCase("pt-BR")} · HOJE</span>
          <h1>Bom trabalho, {session.user.name.split(" ")[0]}.</h1>
          <p>Seu salão, seu cardápio e os pedidos da equipe, em um só lugar.</p>
        </div>
        <span className="painel-dashboard-date">OPERAÇÃO EM TEMPO REAL</span>
      </div>

      {error ? (
        <div className="painel-dashboard-alert" role="alert">
          <CircleAlert aria-hidden="true" size={19} />
          <span>{error}</span>
          <Button onClick={() => void loadOverview()} type="button" variant="outline">
            <RefreshCw aria-hidden="true" size={15} />
            Tentar novamente
          </Button>
        </div>
      ) : isLoading ? (
        <div className="painel-dashboard-loading" role="status" aria-live="polite">
          <LoaderCircle aria-hidden="true" className="painel-spin" size={20} />
          Atualizando a operação…
        </div>
      ) : (
        <div
          aria-label="Resumo da operação"
          className="painel-dashboard-metrics"
          role="group"
        >
          {metrics.map(({ label, value, icon: Icon, tone }) => (
            <article className="painel-dashboard-metric" key={label}>
              <span className={`painel-dashboard-metric-icon is-${tone}`}>
                <Icon aria-hidden="true" size={18} />
              </span>
              <span className="painel-dashboard-metric-label">{label}</span>
              <strong>{value}</strong>
            </article>
          ))}
        </div>
      )}

      <div className="painel-dashboard-section-heading">
        <div>
          <span className="painel-eyebrow">ATALHOS</span>
          <h2>Continue de onde parou.</h2>
        </div>
      </div>

      <div className="painel-dashboard-shortcuts">
        <Link className="painel-dashboard-shortcut" href="/painel/pedidos">
          <span className="painel-dashboard-shortcut-icon is-plum"><PackageCheck aria-hidden="true" size={20} /></span>
          <span><strong>Acompanhar pedidos</strong><small>Veja a fila e atualize cada etapa.</small></span>
          <ArrowRight aria-hidden="true" size={17} />
        </Link>
        <Link className="painel-dashboard-shortcut" href="/painel/mesas">
          <span className="painel-dashboard-shortcut-icon is-coral"><Armchair aria-hidden="true" size={20} /></span>
          <span><strong>Organizar mesas</strong><small>Gerencie lugares e códigos QR.</small></span>
          <ArrowRight aria-hidden="true" size={17} />
        </Link>
        <Link className="painel-dashboard-shortcut" href="/painel/catalogo">
          <span className="painel-dashboard-shortcut-icon is-amber"><LayoutGrid aria-hidden="true" size={20} /></span>
          <span><strong>Editar cardápio</strong><small>Atualize produtos e categorias.</small></span>
          <ArrowRight aria-hidden="true" size={17} />
        </Link>
      </div>

      <p className="painel-transition-note">
        As áreas novas usam a base local do Comandinha; o painel legado continua disponível durante a migração.
      </p>
    </section>
  );
}
