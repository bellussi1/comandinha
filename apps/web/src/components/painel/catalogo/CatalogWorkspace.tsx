"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Archive,
  ArrowDownWideNarrow,
  Check,
  CircleAlert,
  Clock3,
  FolderPlus,
  Leaf,
  LoaderCircle,
  PackageOpen,
  PencilLine,
  Plus,
  Search,
  Sparkles,
  Trash2,
  Utensils,
} from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
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
  archiveCatalogProduct,
  CatalogRequestError,
  createCatalogCategory,
  createCatalogProduct,
  listCatalogCategories,
  listCatalogProducts,
  removeCatalogCategory,
  updateCatalogCategory,
  updateCatalogProduct,
  type CatalogCategory,
  type CatalogProduct,
  type CreateCatalogCategory,
  type CreateCatalogProduct,
  type UpdateCatalogCategory,
  type UpdateCatalogProduct,
} from "@/src/services/catalog";
import { usePainelSession } from "../PainelSessionContext";
import { CategoryForm } from "./CategoryForm";
import { ProductForm } from "./ProductForm";

type CatalogTab = "products" | "categories";
type Editor = "product" | "category" | null;

const money = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

function messageFor(error: unknown, fallback: string): string {
  if (error instanceof CatalogRequestError && error.status === 409) {
    if (error.message.toLowerCase().includes("still contains products")) {
      return "Esta categoria ainda possui produtos. Mova ou arquive os produtos antes de excluir a categoria.";
    }
    if (error.message.toLowerCase().includes("category with this name")) {
      return "Já existe uma categoria com esse nome.";
    }
  }
  return error instanceof Error ? error.message : fallback;
}

export function CatalogWorkspace() {
  const session = usePainelSession();
  const canManage =
    session.membership.role === "OWNER" || session.membership.role === "ADMIN";
  const [tab, setTab] = useState<CatalogTab>("products");
  const [editor, setEditor] = useState<Editor>(null);
  const [editingProduct, setEditingProduct] = useState<CatalogProduct | null>(
    null,
  );
  const [editingCategory, setEditingCategory] = useState<CatalogCategory | null>(
    null,
  );
  const [categories, setCategories] = useState<CatalogCategory[]>([]);
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [categoryToDelete, setCategoryToDelete] =
    useState<CatalogCategory | null>(null);

  const fetchCatalogSnapshot = useCallback(async () => {
      const [nextCategories, nextProducts] = await Promise.all([
        listCatalogCategories(),
        listCatalogProducts({
          ...(canManage && showArchived ? { includeArchived: true } : {}),
        }),
      ]);
      return { categories: nextCategories, products: nextProducts };
  }, [canManage, showArchived]);

  const loadCatalog = useCallback(async () => {
    setLoadError(null);
    try {
      const snapshot = await fetchCatalogSnapshot();
      const { categories: nextCategories, products: nextProducts } = snapshot;
      setCategories(nextCategories);
      setProducts(nextProducts);
    } catch (error) {
      setLoadError(
        messageFor(error, "Não foi possível carregar o catálogo agora."),
      );
    } finally {
      setIsLoading(false);
    }
  }, [fetchCatalogSnapshot]);

  useEffect(() => {
    let active = true;
    void fetchCatalogSnapshot()
      .then(({ categories: nextCategories, products: nextProducts }) => {
        if (!active) return;
        setCategories(nextCategories);
        setProducts(nextProducts);
        setLoadError(null);
      })
      .catch((error: unknown) => {
        if (active) {
          setLoadError(
            messageFor(error, "Não foi possível carregar o catálogo agora."),
          );
        }
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [fetchCatalogSnapshot]);

  const filteredProducts = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase("pt-BR");
    return products.filter((product) => {
      if (categoryFilter && product.categoryId !== categoryFilter) return false;
      if (!normalizedSearch) return true;
      const categoryName =
        categories.find((category) => category.id === product.categoryId)?.name ??
        "";
      return `${product.name} ${product.description ?? ""} ${categoryName}`
        .toLocaleLowerCase("pt-BR")
        .includes(normalizedSearch);
    });
  }, [categories, categoryFilter, products, search]);

  function openProductEditor(product?: CatalogProduct) {
    setActionError(null);
    setEditingProduct(product ?? null);
    setEditor("product");
  }

  function openCategoryEditor(category?: CatalogCategory) {
    setActionError(null);
    setEditingCategory(category ?? null);
    setEditor("category");
  }

  function closeEditor() {
    setEditor(null);
    setEditingProduct(null);
    setEditingCategory(null);
  }

  async function saveProduct(payload: CreateCatalogProduct) {
    await createCatalogProduct(payload);
    closeEditor();
    await loadCatalog();
  }

  async function updateProduct(payload: UpdateCatalogProduct) {
    if (!editingProduct) return;
    await updateCatalogProduct(editingProduct.id, payload);
    closeEditor();
    await loadCatalog();
  }

  async function saveCategory(
    payload: CreateCatalogCategory,
  ) {
    await createCatalogCategory(payload);
    closeEditor();
    await loadCatalog();
  }

  async function updateCategory(payload: UpdateCatalogCategory) {
    if (!editingCategory) return;
    await updateCatalogCategory(editingCategory.id, payload);
    closeEditor();
    await loadCatalog();
  }

  async function changeAvailability(product: CatalogProduct) {
    setActionError(null);
    try {
      await updateCatalogProduct(product.id, { available: !product.available });
      await loadCatalog();
    } catch (error) {
      setActionError(
        messageFor(error, "Não foi possível atualizar a disponibilidade."),
      );
    }
  }

  async function changeFeatured(product: CatalogProduct) {
    setActionError(null);
    try {
      await updateCatalogProduct(product.id, { featured: !product.featured });
      await loadCatalog();
    } catch (error) {
      setActionError(messageFor(error, "Não foi possível atualizar o destaque."));
    }
  }

  async function archiveProduct(product: CatalogProduct) {
    setActionError(null);
    try {
      await archiveCatalogProduct(product.id);
      await loadCatalog();
    } catch (error) {
      setActionError(messageFor(error, "Não foi possível arquivar o produto."));
    }
  }

  async function restoreProduct(product: CatalogProduct) {
    setActionError(null);
    try {
      await updateCatalogProduct(product.id, { isActive: true });
      await loadCatalog();
    } catch (error) {
      setActionError(messageFor(error, "Não foi possível restaurar o produto."));
    }
  }

  async function deleteCategory() {
    if (!categoryToDelete) return;
    setActionError(null);
    try {
      await removeCatalogCategory(categoryToDelete.id);
      setCategoryToDelete(null);
      await loadCatalog();
    } catch (error) {
      setCategoryToDelete(null);
      setActionError(
        messageFor(error, "Não foi possível excluir a categoria."),
      );
    }
  }

  if (editor === "product") {
    return (
      <section className="painel-catalog-page">
        <ProductForm
          categories={categories}
          initialProduct={editingProduct ?? undefined}
          key={editingProduct?.id ?? "new-product"}
          onCancel={closeEditor}
          onSave={saveProduct}
          onUpdate={updateProduct}
        />
      </section>
    );
  }

  if (editor === "category") {
    return (
      <section className="painel-catalog-page">
        <CategoryForm
          initialCategory={editingCategory ?? undefined}
          key={editingCategory?.id ?? "new-category"}
          onCancel={closeEditor}
          onSave={saveCategory}
          onUpdate={updateCategory}
        />
      </section>
    );
  }

  return (
    <section aria-busy={isLoading} className="painel-catalog-page">
      <div className="painel-catalog-heading">
        <div className="painel-page-heading">
          <span className="painel-eyebrow">
            {session.restaurant.name.toLocaleUpperCase("pt-BR")} · CATÁLOGO
          </span>
          <h1>Cardápio com ordem.</h1>
          <p>Organize produtos e categorias em um só lugar.</p>
        </div>
        <span className="painel-catalog-count" aria-label={`${products.length} produtos e ${categories.length} categorias`}>
          <Utensils aria-hidden="true" size={16} />
          {products.length} produtos
          <span aria-hidden="true">·</span>
          {categories.length} categorias
        </span>
      </div>

      <div className="painel-catalog-tabs" role="tablist" aria-label="Seções do catálogo">
        <button
          aria-selected={tab === "products"}
          className={tab === "products" ? "is-active" : ""}
          onClick={() => setTab("products")}
          role="tab"
          type="button"
        >
          Produtos <span>{products.length}</span>
        </button>
        <button
          aria-selected={tab === "categories"}
          className={tab === "categories" ? "is-active" : ""}
          onClick={() => setTab("categories")}
          role="tab"
          type="button"
        >
          Categorias <span>{categories.length}</span>
        </button>
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

      {loadError ? (
        <div className="painel-catalog-state" role="alert">
          <CircleAlert aria-hidden="true" size={23} />
          <h2>O catálogo não carregou.</h2>
          <p>{loadError}</p>
          <Button onClick={() => void loadCatalog()} type="button" variant="outline">
            Tentar novamente
          </Button>
        </div>
      ) : isLoading ? (
        <div className="painel-catalog-state" role="status" aria-live="polite">
          <LoaderCircle aria-hidden="true" className="painel-spin" size={23} />
          <span>Carregando seu catálogo…</span>
        </div>
      ) : tab === "products" ? (
        <>
          <div className="painel-catalog-toolbar">
            <label className="painel-search" htmlFor="catalog-search">
              <Search aria-hidden="true" size={18} />
              <Input
                aria-label="Buscar produto ou categoria"
                id="catalog-search"
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar produto ou categoria"
                type="search"
                value={search}
              />
            </label>
            <label className="painel-filter-select" htmlFor="catalog-category-filter">
              <ArrowDownWideNarrow aria-hidden="true" size={17} />
              <select
                id="catalog-category-filter"
                onChange={(event) => setCategoryFilter(event.target.value)}
                value={categoryFilter}
              >
                <option value="">Todas as categorias</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>
            {canManage && (
              <Button
                aria-pressed={showArchived}
                className={`painel-archive-filter${showArchived ? " is-active" : ""}`}
                onClick={() => setShowArchived((current) => !current)}
                type="button"
                variant="outline"
              >
                <Archive aria-hidden="true" size={16} />
                {showArchived ? "Ocultar arquivados" : "Mostrar arquivados"}
              </Button>
            )}
            {canManage && (
              <Button
                className="painel-action-button painel-new-button"
                disabled={categories.length === 0}
                onClick={() => openProductEditor()}
                title={categories.length === 0 ? "Cadastre uma categoria primeiro" : undefined}
                type="button"
              >
                <Plus aria-hidden="true" size={17} />
                Novo produto
              </Button>
            )}
          </div>

          {canManage && categories.length === 0 && (
            <div className="painel-first-category-note">
              <FolderPlus aria-hidden="true" size={19} />
              <p>Comece criando uma categoria. Depois, você pode incluir produtos nela.</p>
              <Button onClick={() => { setTab("categories"); openCategoryEditor(); }} type="button" variant="outline">
                Criar categoria
              </Button>
            </div>
          )}

          {filteredProducts.length === 0 ? (
            <div className="painel-catalog-state painel-empty-state">
              <span className="painel-empty-mark"><PackageOpen aria-hidden="true" size={25} /></span>
              <h2>{products.length === 0 ? "Nenhum produto por aqui" : "Nenhum resultado encontrado"}</h2>
              <p>
                {products.length === 0
                  ? "Inclua o primeiro item do cardápio para começar."
                  : "Tente outra busca ou selecione uma categoria diferente."}
              </p>
            </div>
          ) : (
            <div className="painel-product-list">
              {filteredProducts.map((product, index) => {
                const categoryName = categories.find(
                  (category) => category.id === product.categoryId,
                )?.name ?? "Sem categoria";
                return (
                  <article
                    className="painel-product-card"
                    key={product.id}
                    style={{ "--card-index": index } as React.CSSProperties}
                  >
                    <div className="painel-product-avatar" aria-hidden="true">
                      {product.imageUrl ? (
                        // Decorative thumbnail only; the API accepts an HTTPS URL.
                        // eslint-disable-next-line @next/next/no-img-element
                        <img alt="" loading="lazy" src={product.imageUrl} />
                      ) : (
                        <Utensils size={20} />
                      )}
                    </div>
                    <div className="painel-product-main">
                      <div className="painel-product-title-line">
                        <h2>{product.name}</h2>
                        {product.featured && (
                          <span className="painel-featured-badge">
                            <Sparkles aria-hidden="true" size={13} /> Destaque
                          </span>
                        )}
                      </div>
                      <p>{product.description || categoryName}</p>
                      <div className="painel-product-meta">
                        <span>{categoryName}</span>
                        {product.prepTimeMinutes && (
                          <span><Clock3 aria-hidden="true" size={13} /> {product.prepTimeMinutes} min</span>
                        )}
                        {product.dietaryTags.slice(0, 2).map((tag) => (
                          <span key={tag}><Leaf aria-hidden="true" size={12} /> {tag}</span>
                        ))}
                      </div>
                    </div>
                    <div className="painel-product-price">
                      <strong>{money.format(product.priceInCents / 100)}</strong>
                      <span className={product.isActive ? product.available ? "is-available" : "is-unavailable" : "is-archived"}>
                        {product.isActive ? product.available ? "Disponível" : "Indisponível" : "Arquivado"}
                      </span>
                    </div>
                    {canManage && (
                      <div className="painel-product-actions" aria-label={`Ações de ${product.name}`}>
                        {product.isActive ? (
                          <>
                            <button
                              aria-label={`Marcar ${product.name} ${product.available ? "indisponível" : "disponível"}`}
                              aria-pressed={product.available}
                              className="painel-icon-action"
                              onClick={() => void changeAvailability(product)}
                              title={product.available ? "Marcar indisponível" : "Marcar disponível"}
                              type="button"
                            >
                              <Check aria-hidden="true" size={17} />
                            </button>
                            <button
                              aria-label={product.featured ? `Remover destaque de ${product.name}` : `Destacar ${product.name}`}
                              aria-pressed={product.featured}
                              className="painel-icon-action"
                              onClick={() => void changeFeatured(product)}
                              title={product.featured ? "Remover destaque" : "Destacar produto"}
                              type="button"
                            >
                              <Sparkles aria-hidden="true" size={17} />
                            </button>
                            <button
                              aria-label={`Editar ${product.name}`}
                              className="painel-icon-action"
                              onClick={() => openProductEditor(product)}
                              title="Editar produto"
                              type="button"
                            >
                              <PencilLine aria-hidden="true" size={17} />
                            </button>
                            <button
                              aria-label={`Arquivar ${product.name}`}
                              className="painel-icon-action is-danger"
                              onClick={() => void archiveProduct(product)}
                              title="Arquivar produto"
                              type="button"
                            >
                              <Archive aria-hidden="true" size={17} />
                            </button>
                          </>
                        ) : (
                          <button
                            aria-label={`Restaurar ${product.name}`}
                            className="painel-restore-button"
                            onClick={() => void restoreProduct(product)}
                            type="button"
                          >
                            Restaurar
                          </button>
                        )}
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </>
      ) : (
        <>
          <div className="painel-catalog-toolbar painel-category-toolbar">
            <div className="painel-toolbar-copy">
              <span>{categories.length} {categories.length === 1 ? "categoria" : "categorias"}</span>
              <small>Os produtos permanecem separados por seção.</small>
            </div>
            {canManage && (
              <Button className="painel-action-button painel-new-button" onClick={() => openCategoryEditor()} type="button">
                <Plus aria-hidden="true" size={17} />
                Nova categoria
              </Button>
            )}
          </div>
          {categories.length === 0 ? (
            <div className="painel-catalog-state painel-empty-state">
              <span className="painel-empty-mark"><FolderPlus aria-hidden="true" size={25} /></span>
              <h2>Organize o cardápio por categorias</h2>
              <p>Crie seções como bebidas, pratos principais ou sobremesas.</p>
            </div>
          ) : (
            <div className="painel-category-list">
              {categories.map((category, index) => (
                <article
                  className="painel-category-card"
                  key={category.id}
                  style={{ "--card-index": index } as React.CSSProperties}
                >
                  <div className="painel-category-index">{String(index + 1).padStart(2, "0")}</div>
                  <div className="painel-category-copy">
                    <h2>{category.name}</h2>
                    <p>{category.description || "Sem descrição"}</p>
                  </div>
                  <span className="painel-category-count">
                    {category.productCount} {category.productCount === 1 ? "produto" : "produtos"}
                  </span>
                  {canManage && (
                    <div className="painel-category-actions">
                      <button
                        aria-label={`Editar ${category.name}`}
                        className="painel-icon-action"
                        onClick={() => openCategoryEditor(category)}
                        type="button"
                      >
                        <PencilLine aria-hidden="true" size={17} />
                      </button>
                      <button
                        aria-label={`Excluir ${category.name}`}
                        className="painel-icon-action is-danger"
                        onClick={() => { setActionError(null); setCategoryToDelete(category); }}
                        type="button"
                      >
                        <Trash2 aria-hidden="true" size={17} />
                      </button>
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}
        </>
      )}

      {canManage && (
        <AlertDialog
          open={categoryToDelete !== null}
          onOpenChange={(open) => {
            if (!open) setCategoryToDelete(null);
          }}
        >
          <AlertDialogContent className="painel-confirm-dialog">
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir categoria?</AlertDialogTitle>
              <AlertDialogDescription>
                {categoryToDelete?.name} será removida do catálogo. Categorias com produtos não podem ser excluídas.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                className="painel-confirm-delete"
                onClick={(event) => {
                  event.preventDefault();
                  void deleteCategory();
                }}
              >
                Excluir categoria
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </section>
  );
}
