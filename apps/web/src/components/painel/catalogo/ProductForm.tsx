"use client";

import { useRef, useState, type FormEvent } from "react";
import { ArrowLeft, Check, ImagePlus } from "lucide-react";
import type { ApiPaths } from "@comandinha/api-client";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { Textarea } from "@/src/components/ui/textarea";
import { PriceField, parsePriceToCents } from "./PriceField";
import { isSecureImageUrl } from "./catalog-validation";

type Category =
  ApiPaths["/catalog/categories"]["get"]["responses"][200]["content"]["application/json"][number];
type Product =
  ApiPaths["/catalog/products"]["get"]["responses"][200]["content"]["application/json"][number];
type CreateProduct =
  ApiPaths["/catalog/products"]["post"]["requestBody"]["content"]["application/json"];
type UpdateProduct =
  ApiPaths["/catalog/products/{id}"]["patch"]["requestBody"]["content"]["application/json"];

type ProductFormProps = {
  categories: Category[];
  initialProduct?: Product;
  defaultCategoryId?: string;
  onSave: (payload: CreateProduct) => Promise<void>;
  onUpdate: (payload: UpdateProduct) => Promise<void>;
  onCancel: () => void;
  isSaving?: boolean;
};

export function ProductForm({
  categories,
  initialProduct,
  defaultCategoryId,
  onSave,
  onUpdate,
  onCancel,
  isSaving = false,
}: ProductFormProps) {
  const [name, setName] = useState(initialProduct?.name ?? "");
  const [description, setDescription] = useState(
    initialProduct?.description ?? "",
  );
  const [categoryId, setCategoryId] = useState(
    initialProduct?.categoryId ?? defaultCategoryId ?? "",
  );
  const [price, setPrice] = useState(
    initialProduct
      ? (initialProduct.priceInCents / 100).toFixed(2).replace(".", ",")
      : "",
  );
  const [imageUrl, setImageUrl] = useState(initialProduct?.imageUrl ?? "");
  const [available, setAvailable] = useState(initialProduct?.available ?? true);
  const [featured, setFeatured] = useState(initialProduct?.featured ?? false);
  const [dietaryTags, setDietaryTags] = useState(
    initialProduct?.dietaryTags.join(", ") ?? "",
  );
  const [prepTime, setPrepTime] = useState(
    initialProduct?.prepTimeMinutes?.toString() ?? "",
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

    let priceInCents: number;
    try {
      priceInCents = parsePriceToCents(price);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Confira o preço informado.",
      );
      return;
    }

    try {
      const commonFields = {
        name: name.trim(),
        categoryId,
        priceInCents,
        available,
        featured,
      };
      const parsedTags = dietaryTags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean);

      pendingRef.current = true;
      setIsSubmitting(true);
      if (initialProduct) {
        await onUpdate({
          ...commonFields,
          description: description.trim() || null,
          imageUrl: imageUrl.trim() || null,
          dietaryTags: parsedTags,
          prepTimeMinutes: prepTime ? Number(prepTime) : null,
        });
      } else {
        await onSave({
          ...commonFields,
          ...(description.trim() ? { description: description.trim() } : {}),
          ...(imageUrl.trim() ? { imageUrl: imageUrl.trim() } : {}),
          ...(parsedTags.length ? { dietaryTags: parsedTags } : {}),
          ...(prepTime ? { prepTimeMinutes: Number(prepTime) } : {}),
        });
      }
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Não foi possível salvar o produto. Tente novamente.",
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
          disabled={isBusy}
          onClick={onCancel}
          size="icon"
          type="button"
          variant="ghost"
        >
          <ArrowLeft aria-hidden="true" size={18} />
        </Button>
        <div>
          <span className="painel-eyebrow">
            {initialProduct ? "ATUALIZAÇÃO" : "NOVO ITEM"}
          </span>
          <h2>{initialProduct ? "Editar produto" : "Novo produto"}</h2>
          <p>Informações claras ajudam a equipe e quem vai pedir.</p>
        </div>
      </div>

      <div className="painel-form-grid">
        <label
          className="painel-field painel-field-wide"
          htmlFor="product-name"
        >
          <span>Nome do produto</span>
          <Input
            autoComplete="off"
            id="product-name"
            maxLength={120}
            onChange={(event) => setName(event.target.value)}
            placeholder="Ex.: Suco de laranja"
            required
            value={name}
          />
        </label>

        <label className="painel-field" htmlFor="product-category">
          <span>Categoria</span>
          <select
            className="painel-select"
            id="product-category"
            onChange={(event) => setCategoryId(event.target.value)}
            required
            value={categoryId}
          >
            <option disabled value="">
              Selecione uma categoria
            </option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>

        <PriceField onChange={setPrice} value={price} />

        <label
          className="painel-field painel-field-wide"
          htmlFor="product-description"
        >
          <span>
            Descrição <small>(opcional)</small>
          </span>
          <Textarea
            id="product-description"
            maxLength={2_000}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Conte o que torna este item especial."
            rows={3}
            value={description}
          />
        </label>

        <label
          className="painel-field painel-field-wide"
          htmlFor="product-image-url"
        >
          <span>Imagem (URL HTTPS, opcional)</span>
          <span className="painel-input-with-icon">
            <ImagePlus aria-hidden="true" size={17} />
            <Input
              autoComplete="url"
              id="product-image-url"
              onChange={(event) => setImageUrl(event.target.value)}
              placeholder="https://..."
              type="url"
              value={imageUrl}
            />
          </span>
          <small>Use uma imagem hospedada em um endereço seguro.</small>
        </label>

        <label className="painel-field" htmlFor="product-tags">
          <span>
            Etiquetas <small>(opcional)</small>
          </span>
          <Input
            id="product-tags"
            onChange={(event) => setDietaryTags(event.target.value)}
            placeholder="vegano, sem lactose"
            value={dietaryTags}
          />
          <small>Separe com vírgulas. Ex.: vegano, sem glúten</small>
        </label>

        <label className="painel-field" htmlFor="product-prep-time">
          <span>Preparo (minutos)</span>
          <Input
            id="product-prep-time"
            max={1440}
            min={1}
            onChange={(event) => setPrepTime(event.target.value)}
            placeholder="Ex.: 15"
            type="number"
            value={prepTime}
          />
        </label>
      </div>

      <div className="painel-toggle-row">
        <label className="painel-toggle-card" htmlFor="product-available">
          <span>
            <strong>Disponível para pedidos</strong>
            <small>
              {available
                ? "Pode ser solicitado agora"
                : "Temporariamente indisponível"}
            </small>
          </span>
          <input
            checked={available}
            id="product-available"
            onChange={(event) => setAvailable(event.target.checked)}
            type="checkbox"
          />
        </label>
        <label className="painel-toggle-card" htmlFor="product-featured">
          <span>
            <strong>Destacar no cardápio</strong>
            <small>Ajuda a chamar atenção para este item</small>
          </span>
          <input
            checked={featured}
            id="product-featured"
            onChange={(event) => setFeatured(event.target.checked)}
            type="checkbox"
          />
        </label>
      </div>

      {error && (
        <p className="painel-form-alert" role="alert">
          {error}
        </p>
      )}

      <div className="painel-form-actions">
        <Button
          disabled={isBusy}
          onClick={onCancel}
          type="button"
          variant="outline"
        >
          Cancelar
        </Button>
        <Button
          className="painel-action-button"
          disabled={isBusy}
          type="submit"
        >
          <Check aria-hidden="true" size={16} />
          {isBusy ? "Salvando…" : "Salvar produto"}
        </Button>
      </div>
    </form>
  );
}
