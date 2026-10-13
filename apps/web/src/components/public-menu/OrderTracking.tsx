"use client";

import { useEffect, useState } from "react";
import { CircleAlert, Clock3, LoaderCircle, PackageCheck, Utensils } from "lucide-react";
import {
  listPublicOrderSummaries,
  type PublicOrderStatus,
  type PublicOrderSummary,
} from "@/src/services/public-dining";

type OrderTrackingProps = {
  code: string;
  orderId: string;
};

const statusCopy: Record<PublicOrderStatus, string> = {
  PENDING: "Pedido recebido pelo restaurante",
  PREPARING: "Seu pedido está sendo preparado",
  READY: "Pedido pronto para servir",
  DELIVERED: "Pedido entregue",
  CANCELLED: "Pedido cancelado",
};

const shortStatusCopy: Record<PublicOrderStatus, string> = {
  PENDING: "Recebido",
  PREPARING: "Preparando",
  READY: "Pronto",
  DELIVERED: "Entregue",
  CANCELLED: "Cancelado",
};

function isTerminal(status: PublicOrderStatus): boolean {
  return status === "DELIVERED" || status === "CANCELLED";
}

export function OrderTracking({ code, orderId }: OrderTrackingProps) {
  const [summary, setSummary] = useState<PublicOrderSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    let stopped = false;
    let requestRunning = false;
    let interval: ReturnType<typeof setInterval> | undefined;

    function stop() {
      stopped = true;
      if (interval) clearInterval(interval);
      interval = undefined;
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    }

    async function refresh() {
      if (
        !active ||
        stopped ||
        requestRunning ||
        document.visibilityState !== "visible"
      ) {
        return;
      }

      requestRunning = true;
      try {
        const orders = await listPublicOrderSummaries(code);
        if (!active || stopped) return;
        const trackedOrder = orders.find((order) => order.id === orderId) ?? null;
        setSummary(trackedOrder);
        setError(null);
        setIsLoading(false);
        if (trackedOrder && isTerminal(trackedOrder.status)) stop();
      } catch (cause) {
        if (!active || stopped) return;
        setError(
          cause instanceof Error
            ? cause.message
            : "Não foi possível atualizar o pedido agora.",
        );
        setIsLoading(false);
      } finally {
        requestRunning = false;
      }
    }

    function handleVisibilityChange() {
      if (document.visibilityState !== "visible") {
        if (interval) clearInterval(interval);
        interval = undefined;
        return;
      }

      if (!stopped) {
        if (!interval) interval = setInterval(() => void refresh(), 10_000);
        void refresh();
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    if (document.visibilityState === "visible") handleVisibilityChange();

    return () => {
      active = false;
      stopped = true;
      if (interval) clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [code, orderId]);

  const status = summary?.status;
  const StatusIcon = status === "PREPARING" ? Utensils : status === "READY" || status === "DELIVERED" ? PackageCheck : Clock3;

  return (
    <section
      aria-atomic="true"
      aria-busy={isLoading}
      aria-live="polite"
      className="public-order-tracking"
    >
      <div className="public-order-tracking-icon" aria-hidden="true">
        {isLoading ? (
          <LoaderCircle className="public-menu-spin" size={20} />
        ) : error ? (
          <CircleAlert size={20} />
        ) : (
          <StatusIcon size={20} />
        )}
      </div>
      <div className="public-order-tracking-copy">
        <span className="public-menu-eyebrow">ACOMPANHAMENTO</span>
        <h2>{isLoading ? "Buscando seu pedido" : error ? "Atualização pausada" : "Seu pedido"}</h2>
        <p>
          {isLoading
            ? "Vamos mostrar cada etapa por aqui."
            : error
              ? error
              : status
                ? statusCopy[status]
                : "O pedido ainda não apareceu. Vamos conferir novamente em instantes."}
        </p>
      </div>
      {status && (
        <span className={`public-order-status is-${status.toLocaleLowerCase("en-US")}`}>
          {shortStatusCopy[status]}
        </span>
      )}
    </section>
  );
}
