"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  CircleAlert,
  Clock3,
  CookingPot,
  LoaderCircle,
  PackageCheck,
  RefreshCw,
  X,
} from "lucide-react";
import { Button } from "@/src/components/ui/button";
import {
  listOrders,
  updateOrderStatus,
  type PanelOrder,
  type PanelOrderStatus,
} from "@/src/services/panel-orders";

type OrderFilter = "ALL" | PanelOrderStatus;
type NextStatus = PanelOrderStatus;

const filters: Array<{ value: OrderFilter; label: string }> = [
  { value: "ALL", label: "Todos" },
  { value: "PENDING", label: "Pendentes" },
  { value: "PREPARING", label: "Preparando" },
  { value: "READY", label: "Prontos" },
  { value: "DELIVERED", label: "Entregues" },
  { value: "CANCELLED", label: "Cancelados" },
];

const statusNames: Record<PanelOrderStatus, string> = {
  PENDING: "Pendente",
  PREPARING: "Em preparo",
  READY: "Pronto",
  DELIVERED: "Entregue",
  CANCELLED: "Cancelado",
};

const nextActions: Record<PanelOrderStatus, Array<{ status: NextStatus; label: (table: string) => string }>> = {
  PENDING: [
    { status: "PREPARING", label: (table) => `Iniciar preparo do pedido da ${table}` },
    { status: "CANCELLED", label: (table) => `Cancelar pedido da ${table}` },
  ],
  PREPARING: [
    { status: "READY", label: (table) => `Marcar pedido da ${table} como pronto` },
    { status: "CANCELLED", label: (table) => `Cancelar pedido da ${table}` },
  ],
  READY: [{ status: "DELIVERED", label: (table) => `Entregar pedido da ${table}` }],
  DELIVERED: [],
  CANCELLED: [],
};

const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const dateTime = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "America/Sao_Paulo",
});

function errorMessage(error: unknown): string {
  return error instanceof Error && error.message
    ? error.message
    : "Não foi possível carregar os pedidos agora.";
}

function timeLabel(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Horário indisponível" : dateTime.format(date);
}

function StatusIcon({ status }: { status: PanelOrderStatus }) {
  if (status === "PENDING") return <Clock3 aria-hidden="true" size={15} />;
  if (status === "PREPARING") return <CookingPot aria-hidden="true" size={15} />;
  if (status === "READY") return <PackageCheck aria-hidden="true" size={15} />;
  if (status === "DELIVERED") return <Check aria-hidden="true" size={15} />;
  return <X aria-hidden="true" size={15} />;
}

export function OrdersWorkspace() {
  const [filter, setFilter] = useState<OrderFilter>("ALL");
  const [orders, setOrders] = useState<PanelOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [pendingOrderId, setPendingOrderId] = useState<string | null>(null);

  const loadOrders = useCallback(async (requestedFilter: OrderFilter) => {
    try {
      const nextOrders = await listOrders(requestedFilter === "ALL" ? undefined : requestedFilter);
      setOrders(nextOrders);
      setLoadError(null);
    } catch (error) {
      setLoadError(errorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    void listOrders(filter === "ALL" ? undefined : filter)
      .then((nextOrders) => {
        if (active) {
          setOrders(nextOrders);
          setLoadError(null);
        }
      })
      .catch((error: unknown) => {
        if (active) setLoadError(errorMessage(error));
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [filter]);

  async function advanceOrder(order: PanelOrder, nextStatus: NextStatus) {
    setActionError(null);
    setPendingOrderId(order.id);
    try {
      await updateOrderStatus(order.id, nextStatus);
      await loadOrders(filter);
    } catch (error) {
      setActionError(errorMessage(error));
    } finally {
      setPendingOrderId(null);
    }
  }

  function changeFilter(value: OrderFilter) {
    if (value === filter) return;
    setIsLoading(true);
    setFilter(value);
  }

  return (
    <section aria-busy={isLoading} className="painel-dining-page painel-orders-page">
      <div className="painel-dining-heading">
        <div className="painel-page-heading">
          <span className="painel-eyebrow">ESPAÇO DE TRABALHO · OPERAÇÃO</span>
          <h1>Pedidos, sem perder o ritmo.</h1>
          <p>Acompanhe cada etapa e mantenha a equipe na mesma página.</p>
        </div>
        <Link className="painel-text-link" href="/painel/mesas">
          Ver mesas <ArrowRight aria-hidden="true" size={16} />
        </Link>
      </div>

      {actionError && (
        <div className="painel-inline-alert" role="alert">
          <CircleAlert aria-hidden="true" size={18} />
          <span>{actionError}</span>
          <button aria-label="Fechar aviso" onClick={() => setActionError(null)} type="button">×</button>
        </div>
      )}

      <div aria-label="Filtrar pedidos por status" className="painel-order-filters" role="group">
        {filters.map(({ value, label }) => (
          <button
            aria-pressed={filter === value}
            className={filter === value ? "is-active" : ""}
            key={value}
            onClick={() => changeFilter(value)}
            type="button"
          >
            {label}
          </button>
        ))}
      </div>

      {loadError ? (
        <div className="painel-dining-state" role="alert">
          <CircleAlert aria-hidden="true" size={24} />
          <h2>Os pedidos não carregaram.</h2>
          <p>{loadError}</p>
          <Button onClick={() => void loadOrders(filter)} type="button" variant="outline">
            <RefreshCw aria-hidden="true" size={16} />
            Tentar novamente
          </Button>
        </div>
      ) : isLoading ? (
        <div className="painel-dining-state" role="status" aria-live="polite">
          <LoaderCircle aria-hidden="true" className="painel-spin" size={24} />
          <span>Carregando pedidos…</span>
        </div>
      ) : orders.length === 0 ? (
        <div className="painel-dining-state painel-dining-empty">
          <span className="painel-dining-empty-icon"><PackageCheck aria-hidden="true" size={24} /></span>
          <h2>Nenhum pedido por aqui</h2>
          <p>Quando um cliente pedir pelo QR de uma mesa, o pedido aparecerá nesta fila.</p>
          <Link className="painel-action-button painel-empty-link" href="/painel/mesas">
            Configurar mesas <ArrowRight aria-hidden="true" size={16} />
          </Link>
        </div>
      ) : (
        <div className="painel-order-list">
          {orders.map((order, index) => {
            const actions = nextActions[order.status];
            return (
              <article
                className="painel-order-card"
                key={order.id}
                style={{ "--card-index": index } as React.CSSProperties}
              >
                <div className="painel-order-card-header">
                  <div className="painel-order-table">
                    <span className="painel-eyebrow">{timeLabel(order.createdAt)}</span>
                    <h2>{order.table.name}</h2>
                  </div>
                  <span className={`painel-order-status is-${order.status.toLocaleLowerCase("en-US")}`}>
                    <StatusIcon status={order.status} />
                    {statusNames[order.status]}
                  </span>
                </div>
                <ul aria-label={`Itens do pedido da ${order.table.name}`} className="painel-order-items">
                  {order.items.map((item) => (
                    <li key={item.id}>
                      <span><strong>{item.quantity}×</strong> {item.nameSnapshot}</span>
                      <span>{money.format(item.lineTotalInCents / 100)}</span>
                    </li>
                  ))}
                </ul>
                {order.notes && <p className="painel-order-notes">“{order.notes}”</p>}
                <div className="painel-order-card-footer">
                  <div className="painel-order-total">
                    <span>Total</span>
                    <strong>{money.format(order.totalInCents / 100)}</strong>
                  </div>
                  {actions.length > 0 && (
                    <div className="painel-order-actions">
                      {actions.map((action) => (
                        <Button
                          className={action.status === "CANCELLED" ? "painel-order-cancel" : "painel-action-button"}
                          aria-label={action.label(order.table.name)}
                          aria-busy={pendingOrderId === order.id}
                          disabled={pendingOrderId === order.id}
                          key={action.status}
                          onClick={() => void advanceOrder(order, action.status)}
                          type="button"
                          variant={action.status === "CANCELLED" ? "outline" : "default"}
                        >
                          {pendingOrderId === order.id ? (
                            <LoaderCircle aria-hidden="true" className="painel-spin" size={16} />
                          ) : (
                            <StatusIcon status={action.status} />
                          )}
                          {action.label(order.table.name)}
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
