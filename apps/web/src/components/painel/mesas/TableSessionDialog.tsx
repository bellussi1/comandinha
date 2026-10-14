"use client";

import { useState } from "react";
import { AlertCircle, LoaderCircle, RefreshCw, ReceiptText } from "lucide-react";
import { Button } from "@/src/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/src/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/src/components/ui/dialog";
import type {
  PanelDiningSession,
  PanelTable,
} from "@/src/services/panel-tables";

type TableSessionDialogProps = {
  open: boolean;
  table: PanelTable | null;
  session: PanelDiningSession | null;
  canManage: boolean;
  isLoading: boolean;
  isClosing: boolean;
  error: string | null;
  onOpenChange: (open: boolean) => void;
  onRetry: () => void;
  onConfirmClose: () => void;
};

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const orderStatusLabels: Record<
  PanelDiningSession["orders"][number]["status"],
  string
> = {
  PENDING: "Novo",
  PREPARING: "Em preparo",
  READY: "Pronto para servir",
  DELIVERED: "Entregue",
  CANCELLED: "Cancelado",
};

function formatCurrency(amountInCents: number): string {
  return currencyFormatter.format(amountInCents / 100);
}

export function TableSessionDialog({
  open,
  table,
  session,
  canManage,
  isLoading,
  isClosing,
  error,
  onOpenChange,
  onRetry,
  onConfirmClose,
}: TableSessionDialogProps) {
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const pendingOrders = session?.nonTerminalOrderCount ?? 0;
  const dialogTitle = table ? `Conta da ${table.name}` : "Conta da mesa";

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) setIsConfirmOpen(false);
        onOpenChange(nextOpen);
      }}
    >
      <DialogContent
        aria-busy={isLoading || isClosing}
        className="painel-table-session-dialog"
        overlayClassName="painel-table-session-overlay"
      >
        <DialogHeader>
          <span className="painel-eyebrow">ATENDIMENTO · SALÃO</span>
          <DialogTitle>{dialogTitle}</DialogTitle>
          <DialogDescription>
            Confira os pedidos e o total calculado pelo sistema antes de fechar.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="painel-session-state" role="status" aria-live="polite">
            <LoaderCircle
              aria-hidden="true"
              className="painel-spin"
              size={19}
            />
            Carregando atendimento…
          </div>
        ) : error ? (
          <div className="painel-session-error" role="alert">
            <AlertCircle aria-hidden="true" size={18} />
            <span>{error}</span>
            <Button
              onClick={onRetry}
              size="sm"
              type="button"
              variant="outline"
            >
              <RefreshCw aria-hidden="true" size={15} />
              Tentar novamente
            </Button>
          </div>
        ) : session ? (
          <>
            <section
              aria-label="Resumo da conta"
              className="painel-session-balance"
            >
              <div>
                <span className="painel-eyebrow">TOTAL PARCIAL</span>
                <strong>{formatCurrency(session.projectedTotalInCents)}</strong>
              </div>
              <span className="painel-session-order-count">
                <ReceiptText aria-hidden="true" size={16} />
                {session.orders.length}{" "}
                {session.orders.length === 1 ? "pedido" : "pedidos"}
              </span>
            </section>

            {pendingOrders > 0 && (
              <p className="painel-session-blocking-note">
                {pendingOrders === 1
                  ? "1 pedido ainda precisa ser finalizado para fechar a conta."
                  : `${pendingOrders} pedidos ainda precisam ser finalizados para fechar a conta.`}
              </p>
            )}

            {session.orders.length === 0 ? (
              <div className="painel-session-empty">
                <ReceiptText aria-hidden="true" size={20} />
                <p>Nenhum pedido registrado neste atendimento.</p>
              </div>
            ) : (
              <ol aria-label="Pedidos deste atendimento" className="painel-session-orders">
                {session.orders.map((order) => (
                  <li className="painel-session-order" key={order.id}>
                    <div className="painel-session-order-heading">
                      <strong>Pedido #{order.id.slice(0, 6)}</strong>
                      <span
                        className={`painel-session-order-status is-${order.status.toLowerCase()}`}
                      >
                        {orderStatusLabels[order.status]}
                      </span>
                    </div>
                    <ul className="painel-session-order-items">
                      {order.items.map((item) => (
                        <li key={item.id}>
                          <span>
                            {item.quantity}× {item.nameSnapshot}
                          </span>
                          <strong>{formatCurrency(item.lineTotalInCents)}</strong>
                        </li>
                      ))}
                    </ul>
                    <div className="painel-session-order-total">
                      <span>Total do pedido</span>
                      <strong>{formatCurrency(order.totalInCents)}</strong>
                    </div>
                  </li>
                ))}
              </ol>
            )}

            <div className="painel-session-dialog-actions">
              <Button
                onClick={() => onOpenChange(false)}
                type="button"
                variant="outline"
              >
                Voltar
              </Button>
              {canManage && (
                <Button
                  className="painel-session-close-button"
                  disabled={pendingOrders > 0 || isClosing}
                  onClick={() => setIsConfirmOpen(true)}
                  type="button"
                >
                  {isClosing && (
                    <LoaderCircle
                      aria-hidden="true"
                      className="painel-spin"
                      size={16}
                    />
                  )}
                  Fechar conta
                </Button>
              )}
            </div>
          </>
        ) : (
          <div className="painel-session-empty">
            <ReceiptText aria-hidden="true" size={20} />
            <p>Este atendimento não está mais aberto.</p>
          </div>
        )}
      </DialogContent>

      <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <AlertDialogContent
          className="painel-session-confirm-dialog"
          overlayClassName="painel-session-confirm-overlay"
        >
          <AlertDialogHeader>
            <AlertDialogTitle>
              Encerrar atendimento da {table?.name ?? "mesa"}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              O servidor registrará o total final de{" "}
              <strong>{formatCurrency(session?.projectedTotalInCents ?? 0)}</strong>
              . Os pedidos permanecem no histórico.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isClosing}>Revisar conta</AlertDialogCancel>
            <AlertDialogAction
              className="painel-session-confirm-action"
              disabled={isClosing}
              onClick={onConfirmClose}
            >
              {isClosing ? "Encerrando…" : "Confirmar encerramento"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
