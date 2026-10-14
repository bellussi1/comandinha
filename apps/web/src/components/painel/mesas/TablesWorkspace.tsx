"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Armchair,
  CircleAlert,
  LoaderCircle,
  Plus,
  QrCode,
  RefreshCw,
  SquarePen,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import { Button } from "@/src/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/src/components/ui/dialog";
import {
  createTable,
  listTables,
  updateTable,
  type PanelTable,
} from "@/src/services/panel-tables";
import { usePainelSession } from "../PainelSessionContext";
import { TableForm } from "./TableForm";

type FormState = { table?: PanelTable } | null;
type QrState = { table: PanelTable; publicUrl: string } | null;
type QrDialogComponent = typeof import("./TableQrDialog").TableQrDialog;

function getActionError(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

function orderCountLabel(count: number): string {
  if (count === 0) return "Sem pedidos em andamento";
  return `${count} ${count === 1 ? "pedido" : "pedidos"} em andamento`;
}

export function TablesWorkspace() {
  const session = usePainelSession();
  const canManage = session.membership.role === "OWNER" || session.membership.role === "ADMIN";
  const [tables, setTables] = useState<PanelTable[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(null);
  const [qr, setQr] = useState<QrState>(null);
  const [QrDialog, setQrDialog] = useState<QrDialogComponent | null>(null);
  const [qrLoadingTableId, setQrLoadingTableId] = useState<string | null>(null);
  const [pendingTableId, setPendingTableId] = useState<string | null>(null);

  const loadTables = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const result = await listTables();
      setTables(result);
      setLoadError(null);
    } catch (error) {
      setLoadError(getActionError(error, "Não foi possível carregar as mesas."));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    void listTables()
      .then((result) => {
        if (active) {
          setTables(result);
          setLoadError(null);
        }
      })
      .catch((error: unknown) => {
        if (active) setLoadError(getActionError(error, "Não foi possível carregar as mesas."));
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  async function saveTable(payload: { name: string }) {
    if (form?.table) {
      await updateTable(form.table.id, payload);
    } else {
      await createTable(payload);
    }
    setForm(null);
    await loadTables();
  }

  async function toggleTable(table: PanelTable) {
    setActionError(null);
    setPendingTableId(table.id);
    try {
      await updateTable(table.id, { isActive: !table.isActive });
      await loadTables();
    } catch (error) {
      setActionError(getActionError(error, "Não foi possível atualizar a mesa."));
    } finally {
      setPendingTableId(null);
    }
  }

  async function openQr(table: PanelTable) {
    setActionError(null);
    setQrLoadingTableId(table.id);
    try {
      const qrModule = await import("./TableQrDialog");
      setQrDialog(() => qrModule.TableQrDialog);
      const publicUrl = new URL(`/q/${table.publicCode}`, window.location.origin).toString();
      setQr({ table, publicUrl });
    } catch {
      setActionError("Não foi possível carregar o QR agora. Tente novamente.");
    } finally {
      setQrLoadingTableId(null);
    }
  }

  const activeCount = tables.filter((table) => table.isActive).length;

  return (
    <section aria-busy={isLoading} className="painel-dining-page painel-tables-page">
      <div className="painel-dining-heading">
        <div className="painel-page-heading">
          <span className="painel-eyebrow">
            {session.restaurant.name.toLocaleUpperCase("pt-BR")} · ESPAÇO DE TRABALHO
          </span>
          <h1>Mesas com acesso direto.</h1>
          <p>Organize os lugares e deixe o cardápio a um QR de distância.</p>
        </div>
        <div
          aria-label={`${activeCount} de ${tables.length} mesas ativas`}
          className="painel-dining-count"
          role="group"
        >
          <Armchair aria-hidden="true" size={17} />
          <strong>{activeCount}</strong>
          <span>de {tables.length} ativas</span>
        </div>
      </div>

      {actionError && (
        <div className="painel-inline-alert" role="alert">
          <CircleAlert aria-hidden="true" size={18} />
          <span>{actionError}</span>
          <button aria-label="Fechar aviso" onClick={() => setActionError(null)} type="button">×</button>
        </div>
      )}

      <div className="painel-dining-toolbar">
        <div>
          <span className="painel-eyebrow">SALÃO</span>
          <p>{tables.length} {tables.length === 1 ? "mesa cadastrada" : "mesas cadastradas"}</p>
        </div>
        {canManage && (
          <Button
            className="painel-action-button"
            onClick={() => setForm({})}
            type="button"
          >
            <Plus aria-hidden="true" size={17} />
            Nova mesa
          </Button>
        )}
      </div>

      {loadError ? (
        <div className="painel-dining-state" role="alert">
          <CircleAlert aria-hidden="true" size={24} />
          <h2>As mesas não carregaram.</h2>
          <p>{loadError}</p>
          <Button onClick={() => void loadTables()} type="button" variant="outline">
            <RefreshCw aria-hidden="true" size={16} />
            Tentar novamente
          </Button>
        </div>
      ) : isLoading ? (
        <div className="painel-dining-state" role="status" aria-live="polite">
          <LoaderCircle aria-hidden="true" className="painel-spin" size={24} />
          <span>Carregando mesas…</span>
        </div>
      ) : tables.length === 0 ? (
        <div className="painel-dining-state painel-dining-empty">
          <span className="painel-dining-empty-icon"><Armchair aria-hidden="true" size={24} /></span>
          <h2>Ainda não há mesas</h2>
          <p>Cadastre a primeira mesa para criar seu link e código QR.</p>
          {canManage && (
            <Button className="painel-action-button" onClick={() => setForm({})} type="button">
              <Plus aria-hidden="true" size={17} />
              Criar primeira mesa
            </Button>
          )}
        </div>
      ) : (
        <div className="painel-table-grid">
          {tables.map((table, index) => (
            <article
              className={`painel-table-card${table.isActive ? "" : " is-inactive"}`}
              key={table.id}
              style={{ "--card-index": index } as React.CSSProperties}
            >
              <div className="painel-table-card-top">
                <span aria-hidden="true" className="painel-table-mark">
                  <Armchair size={19} />
                </span>
                <span className={`painel-table-status${table.isActive ? " is-active" : ""}`}>
                  <span aria-hidden="true" />
                  {table.isActive ? "Ativa" : "Inativa"}
                </span>
              </div>
              <div className="painel-table-copy">
                <span className="painel-eyebrow">MESA {String(index + 1).padStart(2, "0")}</span>
                <h2>{table.name}</h2>
                <p>{orderCountLabel(table.activeOrderCount)}</p>
              </div>
              <div className="painel-table-actions">
                <Button
                  aria-busy={qrLoadingTableId === table.id}
                  aria-label={qrLoadingTableId === table.id ? `Carregando QR de ${table.name}` : `Ver QR de ${table.name}`}
                  className="painel-table-qr-button"
                  disabled={qrLoadingTableId !== null}
                  onClick={() => void openQr(table)}
                  type="button"
                  variant="outline"
                >
                  {qrLoadingTableId === table.id ? (
                    <>
                      <LoaderCircle aria-hidden="true" className="painel-spin" size={16} />
                      Carregando QR…
                    </>
                  ) : (
                    <>
                      <QrCode aria-hidden="true" size={16} />
                      Ver QR
                    </>
                  )}
                </Button>
                {canManage && (
                  <>
                    <button
                      aria-label={`Renomear ${table.name}`}
                      className="painel-icon-action"
                      onClick={() => setForm({ table })}
                      title="Renomear mesa"
                      type="button"
                    >
                      <SquarePen aria-hidden="true" size={17} />
                      <span className="painel-action-label">Renomear</span>
                    </button>
                    <button
                      aria-label={`${table.isActive ? "Desativar" : "Ativar"} ${table.name}`}
                      className="painel-icon-action"
                      disabled={pendingTableId === table.id}
                      onClick={() => void toggleTable(table)}
                      title={table.isActive ? "Desativar mesa" : "Ativar mesa"}
                      type="button"
                    >
                      {table.isActive ? (
                        <ToggleRight aria-hidden="true" size={18} />
                      ) : (
                        <ToggleLeft aria-hidden="true" size={18} />
                      )}
                      <span className="painel-action-label">
                        {table.isActive ? "Desativar" : "Ativar"}
                      </span>
                    </button>
                  </>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      <Dialog open={form !== null} onOpenChange={(open) => !open && setForm(null)}>
        <DialogContent
          className="painel-table-editor-dialog"
          overlayClassName="painel-table-editor-overlay"
        >
          <DialogHeader>
            <span className="painel-eyebrow">GESTÃO DO SALÃO</span>
            <DialogTitle>{form?.table ? "Renomear mesa" : "Adicionar mesa"}</DialogTitle>
            <DialogDescription>
              O código QR da mesa continua o mesmo depois de uma renomeação.
            </DialogDescription>
          </DialogHeader>
          {form && (
            <TableForm
              initialTable={form.table}
              key={form.table?.id ?? "new-table"}
              onCancel={() => setForm(null)}
              onSave={saveTable}
            />
          )}
        </DialogContent>
      </Dialog>

      {QrDialog && (
        <QrDialog
          onOpenChange={(open) => !open && setQr(null)}
          publicUrl={qr?.publicUrl ?? ""}
          table={qr?.table ?? null}
        />
      )}
    </section>
  );
}
