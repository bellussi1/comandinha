"use client";

import { useState, type FormEvent } from "react";
import { LoaderCircle } from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import type { PanelTable } from "@/src/services/panel-tables";

type TableFormProps = {
  initialTable?: PanelTable;
  onCancel: () => void;
  onSave: (payload: { name: string }) => Promise<void>;
};

export function TableForm({ initialTable, onCancel, onSave }: TableFormProps) {
  const [name, setName] = useState(initialTable?.name ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedName = name.trim();
    if (trimmedName.length === 0 || trimmedName.length > 80) {
      setError("Informe um nome de 1 a 80 caracteres.");
      return;
    }

    setError(null);
    setIsSaving(true);
    try {
      await onSave({ name: trimmedName });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível salvar a mesa.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form className="painel-table-form" onSubmit={submit}>
      <label className="painel-form-field" htmlFor="table-name">
        <span>Nome da mesa</span>
        <Input
          aria-label="Nome da mesa"
          autoComplete="off"
          autoFocus
          id="table-name"
          maxLength={80}
          onChange={(event) => setName(event.target.value)}
          placeholder="Ex.: Varanda 01"
          required
          value={name}
        />
        <small>Use um nome que a equipe reconheça rapidamente.</small>
      </label>
      {error && <p className="painel-inline-alert" role="alert">{error}</p>}
      <div className="painel-table-form-actions">
        <Button onClick={onCancel} type="button" variant="outline">
          Cancelar
        </Button>
        <Button className="painel-action-button" disabled={isSaving} type="submit">
          {isSaving && <LoaderCircle aria-hidden="true" className="painel-spin" size={16} />}
          {initialTable ? "Salvar alterações" : "Criar mesa"}
        </Button>
      </div>
    </form>
  );
}
