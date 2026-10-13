"use client";

import { useRef, useState, type FormEvent } from "react";
import { ArrowLeft, Check, ImagePlus } from "lucide-react";
import type { ApiPaths } from "@comandinha/api-client";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { Textarea } from "@/src/components/ui/textarea";
import { isSecureImageUrl } from "./catalog-validation";

type Category = ApiPaths["/catalog/categories"]["get"]["responses"][200]["content"]["application/json"][number];
type CategoryInput = ApiPaths["/catalog/categories"]["post"]["requestBody"]["content"]["application/json"];
type CategoryUpdate = ApiPaths["/catalog/categories/{id}"]["patch"]["requestBody"]["content"]["application/json"];

type CategoryFormProps = {
  initialCategory?: Category;
  onSave: (payload: CategoryInput) => Promise<void>;
  onUpdate: (payload: CategoryUpdate) => Promise<void>;
  onCancel: () => void;
  isSaving?: boolean;
};

export function CategoryForm({
  initialCategory,
  onSave,
  onUpdate,
  onCancel,
  isSaving = false,
}: CategoryFormProps) {
  const [name, setName] = useState(initialCategory?.name ?? "");
  const [description, setDescription] = useState(
    initialCategory?.description ?? "",
  );
  const [imageUrl, setImageUrl] = useState(initialCategory?.imageUrl ?? "");
  const [displayOrder, setDisplayOrder] = useState(
    initialCategory?.displayOrder.toString() ?? "0",
  );
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const pendingRef = useRef(false);
  const isBusy = isSaving || isSubmitting;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isBusy || pendingRef.current) return;
    setError(null);
    if (imageUrl.trim() && !isSecureImageUrl(imageUrl)) {
      setError("A imagem precisa usar uma URL HTTPS válida.");
      return;
    }

    try {
      pendingRef.current = true;
      setIsSubmitting(true);
      if (initialCategory) {
        await onUpdate({
          name: name.trim(),
          displayOrder: Number(displayOrder),
          description: description.trim() || null,
          imageUrl: imageUrl.trim() || null,
        });
      } else {
        await onSave({
          name: name.trim(),
          displayOrder: Number(displayOrder),
          ...(description.trim() ? { description: description.trim() } : {}),
          ...(imageUrl.trim() ? { imageUrl: imageUrl.trim() } : {}),
        });
      }
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Não foi possível salvar a categoria. Tente novamente.",
      );
    } finally {
      pendingRef.current = false;
      setIsSubmitting(false);
    }
  }

  return (
    <form className="painel-editor-form" onSubmit={handleSubmit}>
      <div className="painel-editor-heading">
        <Button
          aria-label="Voltar ao catálogo"
          className="painel-back-button"
          onClick={onCancel}
          size="icon"
          type="button"
          variant="ghost"
        >
          <ArrowLeft aria-hidden="true" size={18} />
        </Button>
        <div>
          <span className="painel-eyebrow">
            {initialCategory ? "ORGANIZAÇÃO" : "NOVA SEÇÃO"}
          </span>
          <h2>{initialCategory ? "Editar categoria" : "Nova categoria"}</h2>
          <p>Separe os produtos em grupos fáceis de encontrar.</p>
        </div>
      </div>

      <div className="painel-form-grid">
        <label className="painel-field painel-field-wide" htmlFor="category-name">
          <span>Nome da categoria</span>
          <Input
            autoComplete="off"
            id="category-name"
            maxLength={120}
            onChange={(event) => setName(event.target.value)}
            placeholder="Ex.: Bebidas"
            required
            value={name}
          />
        </label>

        <label className="painel-field" htmlFor="category-order">
          <span>Ordem no catálogo</span>
          <Input
            id="category-order"
            max={2_147_483_647}
            min={0}
            onChange={(event) => setDisplayOrder(event.target.value)}
            type="number"
            value={displayOrder}
          />
        </label>

        <label className="painel-field painel-field-wide" htmlFor="category-description">
          <span>Descrição <small>(opcional)</small></span>
          <Textarea
            id="category-description"
            maxLength={2_000}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Uma frase curta sobre esta seção."
            rows={3}
            value={description}
          />
        </label>

        <label className="painel-field painel-field-wide" htmlFor="category-image-url">
          <span>Imagem (URL HTTPS, opcional)</span>
          <span className="painel-input-with-icon">
            <ImagePlus aria-hidden="true" size={17} />
            <Input
              autoComplete="url"
              id="category-image-url"
              onChange={(event) => setImageUrl(event.target.value)}
              placeholder="https://..."
              type="url"
              value={imageUrl}
            />
          </span>
        </label>
      </div>

      {error && <p className="painel-form-alert" role="alert">{error}</p>}

      <div className="painel-form-actions">
        <Button disabled={isBusy} onClick={onCancel} type="button" variant="outline">
          Cancelar
        </Button>
        <Button className="painel-action-button" disabled={isBusy} type="submit">
          <Check aria-hidden="true" size={16} />
          {isBusy ? "Salvando…" : "Salvar categoria"}
        </Button>
      </div>
    </form>
  );
}
