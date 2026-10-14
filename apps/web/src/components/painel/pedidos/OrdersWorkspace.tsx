"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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

const nextActions: Record<
  PanelOrderStatus,
  Array<{
    status: NextStatus;
    label: string;
    accessibleLabel: (table: string) => string;
  }>
> = {
  PENDING: [
    {
      status: "PREPARING",
      label: "Iniciar preparo",
      accessibleLabel: (table) => `Iniciar preparo do pedido da ${table}`,
    },
    {
      status: "CANCELLED",
      label: "Cancelar",
      accessibleLabel: (table) => `Cancelar pedido da ${table}`,
    },
  ],
  PREPARING: [
    {
      status: "READY",
      label: "Marcar pronto",
      accessibleLabel: (table) => `Marcar pedido da ${table} como pronto`,
    },
    {
      status: "CANCELLED",
      label: "Cancelar",
      accessibleLabel: (table) => `Cancelar pedido da ${table}`,
    },
  ],
  READY: [
    {
      status: "DELIVERED",
      label: "Entregar",
      accessibleLabel: (table) => `Entregar pedido da ${table}`,
    },
  ],
  DELIVERED: [],
  CANCELLED: [],
};

const money = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});
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
  return Number.isNaN(date.getTime())
    ? "Horário indisponível"
    : dateTime.format(date);
}

function StatusIcon({ status }: { status: PanelOrderStatus }) {
  if (status === "PENDING") return <Clock3 aria-hidden="true" size={15} />;
  if (status === "PREPARING")
    return <CookingPot aria-hidden="true" size={15} />;
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
  const [pendingOrderIds, setPendingOrderIds] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const pendingOrderIdsRef = useRef(new Set<string>());
  const activeFilterRef = useRef<OrderFilter>("ALL");
  const loadGenerationRef = useRef(0);

  const loadOrders = useCallback(
    async (requestedFilter: OrderFilter, quiet = false) => {
      const generation = ++loadGenerationRef.current;
      if (!quiet) setIsLoading(true);
      try {
        const nextOrders = await listOrders(
          requestedFilter === "ALL" ? undefined : requestedFilter,
        );
        if (
          generation !== loadGenerationRef.current ||
          requestedFilter !== activeFilterRef.current
        )
          return;
        setOrders(nextOrders);
        setLoadError(null);
      } catch (error) {
        if (
          generation === loadGenerationRef.current &&
          requestedFilter === activeFilterRef.current
        ) {
          setLoadError(errorMessage(error));
        }
      } finally {
        if (
          generation === loadGenerationRef.current &&
          requestedFilter === activeFilterRef.current
        ) {
          setIsLoading(false);
        }
      }
    },
    [],
  );

  useEffect(() => {
    // The initial loading state is already true; quiet mode avoids a sync update here.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadOrders(filter, true);
  }, [filter, loadOrders]);

  useEffect(() => {
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") {
        void loadOrders(activeFilterRef.current, true);
      }
    };
    const interval = window.setInterval(refreshWhenVisible, 15_000);
    document.addEventListener("visibilitychange", refreshWhenVisible);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [loadOrders]);

  async function advanceOrder(order: PanelOrder, nextStatus: NextStatus) {
    if (pendingOrderIdsRef.current.has(order.id)) return;
    setActionError(null);
    pendingOrderIdsRef.current.add(order.id);
    setPendingOrderIds(new Set(pendingOrderIdsRef.current));
    try {
      await updateOrderStatus(order.id, nextStatus);
      await loadOrders(activeFilterRef.current, true);
    } catch (error) {
      setActionError(errorMessage(error));
    } finally {
      pendingOrderIdsRef.current.delete(order.id);
      setPendingOrderIds(new Set(pendingOrderIdsRef.current));
    }
  }

  function changeFilter(value: OrderFilter) {
    if (value === filter) return;
    activeFilterRef.current = value;
    loadGenerationRef.current += 1;
    setIsLoading(true);
    setFilter(value);
  }

  return (
    <section
      aria-busy={isLoading}
      className="painel-dining-page painel-orders-page"
    >
      <div className="painel-dining-heading">
        <div className="painel-page-heading">
          <span className="painel-eyebrow">ESPAÇO DE TRABALHO · OPERAÇÃO</span>
          <h1>Pedidos, sem perder o ritmo.</h1>
          <p>Acompanhe cada etapa e mantenha a equipe na mesma página.</p>
        </div>
        <div className="painel-dining-heading-actions">
          <Link className="painel-text-link" href="/painel/mesas">
            Ver mesas <ArrowRight aria-hidden="true" size={16} />
          </Link>
          <Button
            aria-busy={isLoading}
            className="painel-order-refresh"
            disabled={isLoading}
            onClick={() => void loadOrders(activeFilterRef.current)}
            type="button"
            variant="outline"
          >
            <RefreshCw
              aria-hidden="true"
              className={isLoading ? "painel-spin" : undefined}
              size={16}
            />
            Atualizar pedidos
          </Button>
        </div>
      </div>

      {actionError && (
        <div className="painel-inline-alert" role="alert">
          <CircleAlert aria-hidden="true" size={18} />
          <span>{actionError}</span>
          <button
            aria-label="Fechar aviso"
            onClick={() => setActionError(null)}
            type="button"
          >
            ×
          </button>
        </div>
      )}

      <div
        aria-label="Filtrar pedidos por status"
        className="painel-order-filters"
        role="group"
      >
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
          <Button
            onClick={() => void loadOrders(filter)}
            type="button"
            variant="outline"
          >
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
          <span className="painel-dining-empty-icon">
            <PackageCheck aria-hidden="true" size={24} />
          </span>
          <h2>Nenhum pedido por aqui</h2>
          <p>
            Quando um cliente pedir pelo QR de uma mesa, o pedido aparecerá
            nesta fila.
          </p>
          <Link
            className="painel-action-button painel-empty-link"
            href="/painel/mesas"
          >
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
                    <span className="painel-eyebrow">
                      {timeLabel(order.createdAt)}
                    </span>
                    <h2>{order.table.name}</h2>
                  </div>
                  <span
                    className={`painel-order-status is-${order.status.toLocaleLowerCase("en-US")}`}
                  >
                    <StatusIcon status={order.status} />
                    {statusNames[order.status]}
                  </span>
                </div>
                <ul
                  aria-label={`Itens do pedido da ${order.table.name}`}
                  className="painel-order-items"
                >
                  {order.items.map((item) => (
                    <li key={item.id}>
                      <span>
                        <strong>{item.quantity}×</strong> {item.nameSnapshot}
                        {item.notes && (
                          <small className="painel-order-item-notes">
                            “{item.notes}”
                          </small>
                        )}
                      </span>
                      <span>{money.format(item.lineTotalInCents / 100)}</span>
                    </li>
                  ))}
                </ul>
                {order.notes && (
                  <p className="painel-order-notes">“{order.notes}”</p>
                )}
                <div className="painel-order-card-footer">
                  <div className="painel-order-total">
                    <span>Total</span>
                    <strong>{money.format(order.totalInCents / 100)}</strong>
                  </div>
                  {actions.length > 0 && (
                    <div className="painel-order-actions">
                      {actions.map((action) => (
                        <Button
                          className={
                            action.status === "CANCELLED"
                              ? "painel-order-cancel"
                              : "painel-action-button"
                          }
                          aria-label={action.accessibleLabel(order.table.name)}
                          aria-busy={pendingOrderIds.has(order.id)}
                          disabled={pendingOrderIds.has(order.id)}
                          key={action.status}
                          onClick={() =>
                            void advanceOrder(order, action.status)
                          }
                          type="button"
                          variant={
                            action.status === "CANCELLED"
                              ? "outline"
                              : "default"
                          }
                        >
                          {pendingOrderIds.has(order.id) ? (
                            <LoaderCircle
                              aria-hidden="true"
                              className="painel-spin"
                              size={16}
                            />
                          ) : (
                            <StatusIcon status={action.status} />
                          )}
                          {action.label}
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
