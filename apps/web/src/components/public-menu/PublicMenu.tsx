"use client";

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { Armchair, CircleAlert, Clock3, LoaderCircle, Plus, Star } from "lucide-react";
import { Button } from "@/src/components/ui/button";
import {
  getPublicMenu,
  submitPublicOrder,
  type PublicDiningMenu,
  type PublicMenuProduct,
} from "@/src/services/public-dining";
import { ProductImage } from "@/src/utils/imageUtils";
import { MenuCart } from "./MenuCart";
import { OrderTracking } from "./OrderTracking";

export type CartLine = {
  productId: string;
  quantity: number;
  notes?: string;
};

const EMPTY_CART = "[]";
const EMPTY_VALUE = "";
const storageListeners = new Map<string, Set<() => void>>();
const memoryStorage = new Map<string, string>();
const money = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

function cartStorageKey(code: string): string {
  return `comandinha:qr-cart:${code}`;
}

function lastOrderStorageKey(code: string): string {
  return `comandinha:qr-last-order:${code}`;
}

function subscribeStorage(key: string, listener: () => void): () => void {
  let listeners = storageListeners.get(key);
  if (!listeners) {
    listeners = new Set();
    storageListeners.set(key, listeners);
  }
  listeners.add(listener);

  function handleStorage(event: StorageEvent) {
    if (event.key === key || event.key === null) listener();
  }

  window.addEventListener("storage", handleStorage);
  return () => {
    listeners?.delete(listener);
    window.removeEventListener("storage", handleStorage);
    if (listeners?.size === 0) storageListeners.delete(key);
  };
}

function readStorage(key: string, fallback: string): string {
  try {
    return window.localStorage.getItem(key) ?? fallback;
  } catch {
    // Continue with the in-memory value if storage is blocked by the browser.
    return memoryStorage.get(key) ?? fallback;
  }
}

function writeStorage(key: string, value: string | null) {
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
    memoryStorage.delete(key);
  } catch {
    // The current page remains usable when browser storage is unavailable.
    if (value === null) memoryStorage.delete(key);
    else memoryStorage.set(key, value);
  }
  storageListeners.get(key)?.forEach((listener) => listener());
}

function useStoredValue(key: string, fallback: string): string {
  const subscribe = useCallback(
    (listener: () => void) => subscribeStorage(key, listener),
    [key],
  );
  const getSnapshot = useCallback(() => readStorage(key, fallback), [fallback, key]);
  const getServerSnapshot = useCallback(() => fallback, [fallback]);
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

function parseCart(snapshot: string): CartLine[] {
  try {
    const parsed: unknown = JSON.parse(snapshot);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter(
        (line): line is CartLine =>
          typeof line === "object" &&
          line !== null &&
          "productId" in line &&
          typeof line.productId === "string" &&
          "quantity" in line &&
          Number.isInteger(line.quantity) &&
          Number(line.quantity) >= 1 &&
          Number(line.quantity) <= 20,
      )
      .slice(0, 50)
      .map((line) => ({
        productId: line.productId,
        quantity: line.quantity,
        ...(typeof line.notes === "string" && line.notes.trim()
          ? { notes: line.notes.slice(0, 200) }
          : {}),
      }));
  } catch {
    return [];
  }
}

function menuErrorMessage(error: unknown): string {
  return error instanceof Error && error.message
    ? error.message
    : "Não foi possível carregar o cardápio agora.";
}

function PublicMenuExperience({ code }: { code: string }) {
  const cartKey = cartStorageKey(code);
  const lastOrderKey = lastOrderStorageKey(code);
  const cartSnapshot = useStoredValue(cartKey, EMPTY_CART);
  const lastOrderId = useStoredValue(lastOrderKey, EMPTY_VALUE);
  const lines = useMemo(() => parseCart(cartSnapshot), [cartSnapshot]);
  const [menu, setMenu] = useState<PublicDiningMenu | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [menuError, setMenuError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [cartOpen, setCartOpen] = useState(false);
  const [cartNotice, setCartNotice] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const receiveMenu = useCallback((nextMenu: PublicDiningMenu) => {
    setMenu(nextMenu);
    setMenuError(null);
  }, []);

  const loadMenu = useCallback(async () => {
    setIsLoading(true);
    setMenuError(null);
    try {
      receiveMenu(await getPublicMenu(code));
    } catch (error) {
      setMenuError(menuErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, [code, receiveMenu]);

  // Fetch after hydration so the server and first browser render stay identical.
  useEffect(() => {
    let active = true;
    void getPublicMenu(code)
      .then((result) => {
        if (active) receiveMenu(result);
      })
      .catch((error: unknown) => {
        if (active) setMenuError(menuErrorMessage(error));
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [code, receiveMenu]);

  const products = useMemo(
    () => menu?.categories.flatMap((category) => category.products) ?? [],
    [menu],
  );
  const visibleCategories = useMemo(
    () =>
      selectedCategory === "ALL"
        ? menu?.categories ?? []
        : (menu?.categories.filter((category) => category.id === selectedCategory) ?? []),
    [menu, selectedCategory],
  );

  function writeLines(nextLines: CartLine[]) {
    const sanitized = nextLines.slice(0, 50).map((line) => ({
      productId: line.productId,
      quantity: Math.min(20, Math.max(1, Math.trunc(line.quantity))),
      ...(line.notes?.trim() ? { notes: line.notes.slice(0, 200) } : {}),
    }));
    writeStorage(cartKey, sanitized.length ? JSON.stringify(sanitized) : null);
    setSubmitError(null);
  }

  function addProduct(product: PublicMenuProduct) {
    const existing = lines.find((line) => line.productId === product.id);
    if (!existing && lines.length >= 50) {
      setCartNotice("O pedido pode ter até 50 itens diferentes.");
      return;
    }
    if (existing?.quantity === 20) {
      setCartNotice("Cada produto pode ter até 20 unidades por pedido.");
      return;
    }
    setCartNotice(`${product.name} adicionado ao carrinho.`);
    writeLines(
      existing
        ? lines.map((line) =>
            line.productId === product.id
              ? { ...line, quantity: line.quantity + 1 }
              : line,
          )
        : [...lines, { productId: product.id, quantity: 1 }],
    );
  }

  function changeQuantity(productId: string, quantity: number) {
    writeLines(
      lines.map((line) =>
        line.productId === productId ? { ...line, quantity } : line,
      ),
    );
  }

  function changeNotes(productId: string, notes: string) {
    writeLines(
      lines.map((line) =>
        line.productId === productId ? { ...line, notes } : line,
      ),
    );
  }

  function removeProduct(productId: string) {
    writeLines(lines.filter((line) => line.productId !== productId));
  }

  async function sendOrder() {
    if (isSubmitting || !lines.length) return;
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const response = await submitPublicOrder(code, {
        items: lines.map((line) => ({
          productId: line.productId,
          quantity: line.quantity,
          ...(line.notes?.trim() ? { notes: line.notes.trim().slice(0, 200) } : {}),
        })),
      });
      writeStorage(cartKey, null);
      writeStorage(lastOrderKey, response.id);
      setCartOpen(false);
      setCartNotice(null);
    } catch (error) {
      setSubmitError(menuErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  const itemCount = lines.reduce((total, line) => total + line.quantity, 0);

  return (
    <main aria-busy={isLoading} className="public-menu-page">
      <div className="public-menu-shell">
        {menu && (
          <>
            <header className="public-menu-header">
              <span aria-hidden="true" className="public-menu-brand-mark">
                {menu.restaurant.name.trim().charAt(0).toUpperCase()}
              </span>
              <div className="public-menu-restaurant-copy">
                <span className="public-menu-eyebrow">CARDÁPIO DA CASA</span>
                <h1>{menu.restaurant.name}</h1>
                <p><Armchair aria-hidden="true" size={14} /> {menu.table.name}</p>
              </div>
              <span className="public-menu-header-note">PEDIDO À MESA</span>
            </header>

            {lastOrderId && (
              <OrderTracking code={code} key={lastOrderId} orderId={lastOrderId} />
            )}

            <section aria-labelledby="public-menu-title" className="public-menu-intro">
              <span className="public-menu-eyebrow">COZINHA · FEITO NA HORA</span>
              <h2 id="public-menu-title">O que vai ser hoje?</h2>
              <p>Escolha seus favoritos. O pedido chega direto para a equipe.</p>
            </section>

            <nav aria-label="Categorias do cardápio" className="public-menu-categories">
              <button
                aria-pressed={selectedCategory === "ALL"}
                className={selectedCategory === "ALL" ? "is-active" : ""}
                onClick={() => setSelectedCategory("ALL")}
                type="button"
              >
                Todas
              </button>
              {menu.categories.map((category) => (
                <button
                  aria-pressed={selectedCategory === category.id}
                  className={selectedCategory === category.id ? "is-active" : ""}
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  type="button"
                >
                  {category.name}
                </button>
              ))}
            </nav>

            {visibleCategories.length === 0 ||
            visibleCategories.every((category) => category.products.length === 0) ? (
              <section className="public-menu-empty" aria-live="polite">
                <span aria-hidden="true"><Star size={22} /></span>
                <h2>O cardápio está sendo preparado.</h2>
                <p>Volte em instantes para conferir as opções da casa.</p>
              </section>
            ) : (
              <div className="public-menu-category-list">
                {visibleCategories.map((category, categoryIndex) => (
                  <section
                    aria-labelledby={`menu-category-${category.id}`}
                    className="public-menu-category"
                    key={category.id}
                    style={{ "--category-index": categoryIndex } as React.CSSProperties}
                  >
                    <div className="public-menu-category-heading">
                      <div>
                        <span className="public-menu-eyebrow">
                          {String(categoryIndex + 1).padStart(2, "0")} · CARDÁPIO
                        </span>
                        <h2 id={`menu-category-${category.id}`}>{category.name}</h2>
                      </div>
                      {category.description && <p>{category.description}</p>}
                    </div>
                    <div className="public-menu-product-list">
                      {category.products.map((product, productIndex) => (
                        <article
                          className="public-menu-product"
                          key={product.id}
                          style={{ "--product-index": productIndex } as React.CSSProperties}
                        >
                          {product.imageUrl ? (
                            <div className="public-menu-product-image">
                              <ProductImage
                                alt={product.name}
                                className="public-menu-product-photo"
                                height={120}
                                src={product.imageUrl}
                                width={160}
                              />
                            </div>
                          ) : (
                            <span aria-hidden="true" className="public-menu-product-placeholder">
                              {product.name.trim().charAt(0).toUpperCase()}
                            </span>
                          )}
                          <div className="public-menu-product-copy">
                            <div className="public-menu-product-title-row">
                              <h3>{product.name}</h3>
                              {product.featured && (
                                <span className="public-menu-featured">
                                  <Star aria-hidden="true" size={12} /> Destaque
                                </span>
                              )}
                            </div>
                            {product.description && <p>{product.description}</p>}
                            <div className="public-menu-product-meta">
                              <strong>{money.format(product.priceInCents / 100)}</strong>
                              {product.prepTimeMinutes && (
                                <span><Clock3 aria-hidden="true" size={13} /> {product.prepTimeMinutes} min</span>
                              )}
                            </div>
                            {product.dietaryTags.length > 0 && (
                              <div aria-label="Características do produto" className="public-menu-tags">
                                {product.dietaryTags.map((tag) => <span key={tag}>{tag}</span>)}
                              </div>
                            )}
                          </div>
                          <Button
                            aria-label={`Adicionar ${product.name} ao carrinho`}
                            className="public-menu-add-button"
                            onClick={() => addProduct(product)}
                            type="button"
                            variant="outline"
                          >
                            <Plus aria-hidden="true" size={17} />
                            <span>Adicionar</span>
                          </Button>
                        </article>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            )}

            <footer className="public-menu-footer">
              <span>Comandinha</span>
              <span>Feito para deixar a mesa mais leve.</span>
            </footer>
          </>
        )}

        {isLoading && !menu && (
          <div className="public-menu-state" role="status" aria-live="polite">
            <LoaderCircle aria-hidden="true" className="public-menu-spin" size={23} />
            <span>Abrindo o cardápio…</span>
          </div>
        )}
        {menuError && !menu && (
          <div className="public-menu-state public-menu-error" role="alert">
            <CircleAlert aria-hidden="true" size={24} />
            <h1>Este cardápio não abriu.</h1>
            <p>{menuError}</p>
            <Button onClick={() => void loadMenu()} type="button" variant="outline">
              Tentar novamente
            </Button>
          </div>
        )}

        {cartNotice && (
          <p aria-live="polite" className="public-menu-cart-notice">
            {cartNotice} {itemCount > 0 && <span>{itemCount} {itemCount === 1 ? "item" : "itens"} · {money.format(lines.reduce((sum, line) => sum + (products.find((product) => product.id === line.productId)?.priceInCents ?? 0) * line.quantity, 0) / 100)}</span>}
          </p>
        )}

        <MenuCart
          isOpen={cartOpen}
          isReady={Boolean(menu) && !isLoading}
          isSubmitting={isSubmitting}
          lines={lines}
          onNotesChange={changeNotes}
          onOpenChange={setCartOpen}
          onQuantityChange={changeQuantity}
          onRemove={removeProduct}
          onSubmit={sendOrder}
          products={products}
          submitError={submitError}
        />
      </div>
    </main>
  );
}

export function PublicMenu({ code }: { code: string }) {
  return <PublicMenuExperience code={code} key={code} />;
}
