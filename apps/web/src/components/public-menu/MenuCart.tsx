"use client";

import { Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { Button } from "@/src/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/src/components/ui/dialog";
import type { CartLine } from "./PublicMenu";
import type { PublicMenuProduct } from "@/src/services/public-dining";

type MenuCartProps = {
  lines: CartLine[];
  products: PublicMenuProduct[];
  isReady: boolean;
  canOrder: boolean;
  isOpen: boolean;
  isSubmitting: boolean;
  submitError: string | null;
  onOpenChange: (open: boolean) => void;
  onQuantityChange: (productId: string, quantity: number) => void;
  onNotesChange: (productId: string, notes: string) => void;
  onRemove: (productId: string) => void;
  onSubmit: () => Promise<void>;
};

const money = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export function MenuCart({
  lines,
  products,
  isReady,
  canOrder,
  isOpen,
  isSubmitting,
  submitError,
  onOpenChange,
  onQuantityChange,
  onNotesChange,
  onRemove,
  onSubmit,
}: MenuCartProps) {
  const productById = new Map(products.map((product) => [product.id, product]));
  const itemCount = lines.reduce((total, line) => total + line.quantity, 0);
  const totalInCents = lines.reduce((total, line) => {
    const product = productById.get(line.productId);
    return total + (product?.priceInCents ?? 0) * line.quantity;
  }, 0);
  const hasUnavailableProduct = lines.some(
    (line) => !productById.has(line.productId),
  );

  return (
    <>
      <div className="public-menu-cart-dock">
        <Button
          aria-label={`Abrir carrinho · ${itemCount} ${itemCount === 1 ? "item" : "itens"}`}
          className="public-menu-cart-trigger"
          disabled={!isReady || !canOrder || lines.length === 0}
          onClick={() => onOpenChange(true)}
          type="button"
        >
          <span className="public-menu-cart-trigger-icon" aria-hidden="true">
            <ShoppingBag size={19} />
            <span>{itemCount}</span>
          </span>
          <span className="public-menu-cart-trigger-copy">
            <strong>
              Abrir carrinho · {itemCount} {itemCount === 1 ? "item" : "itens"}
            </strong>
            <small>Confira seu pedido</small>
          </span>
          <strong className="public-menu-cart-trigger-total">
            {money.format(totalInCents / 100)}
          </strong>
        </Button>
      </div>

      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent
          className="public-menu-cart-dialog"
          overlayClassName="public-menu-cart-overlay"
        >
          <DialogHeader className="public-menu-cart-dialog-header">
            <span className="public-menu-eyebrow">MESA COMANDA DIGITAL</span>
            <DialogTitle>Seu carrinho</DialogTitle>
            <DialogDescription>
              Confira quantidades e observações antes de enviar à cozinha.
            </DialogDescription>
          </DialogHeader>

          {lines.length === 0 ? (
            <div className="public-menu-cart-empty">
              <ShoppingBag aria-hidden="true" size={27} />
              <p>Seu carrinho está vazio.</p>
              <Button
                onClick={() => onOpenChange(false)}
                type="button"
                variant="outline"
              >
                Voltar ao cardápio
              </Button>
            </div>
          ) : (
            <>
              <div className="public-menu-cart-lines">
                {lines.map((line) => {
                  const product = productById.get(line.productId);
                  return (
                    <article
                      className="public-menu-cart-line"
                      key={line.productId}
                    >
                      <div className="public-menu-cart-line-heading">
                        <div>
                          <h3>{product?.name ?? "Produto indisponível"}</h3>
                          {product ? (
                            <p>
                              {money.format(product.priceInCents / 100)} cada
                            </p>
                          ) : (
                            <p className="public-menu-unavailable">
                              Este item saiu do cardápio. Remova para continuar.
                            </p>
                          )}
                        </div>
                        <button
                          aria-label={`Remover ${product?.name ?? "produto indisponível"}`}
                          className="public-menu-remove-item"
                          disabled={isSubmitting || !canOrder}
                          onClick={() => onRemove(line.productId)}
                          type="button"
                        >
                          <Trash2 aria-hidden="true" size={17} />
                        </button>
                      </div>

                      {product && (
                        <div className="public-menu-cart-line-bottom">
                          <div
                            aria-label={`Quantidade de ${product.name}`}
                            className="public-menu-quantity-control"
                          >
                            <button
                              aria-label={`Diminuir ${product.name}`}
                              disabled={line.quantity <= 1 || isSubmitting || !canOrder}
                              onClick={() =>
                                onQuantityChange(
                                  line.productId,
                                  line.quantity - 1,
                                )
                              }
                              type="button"
                            >
                              <Minus aria-hidden="true" size={15} />
                            </button>
                            <span aria-live="polite">{line.quantity}</span>
                            <button
                              aria-label={`Aumentar ${product.name}`}
                              disabled={line.quantity >= 20 || isSubmitting || !canOrder}
                              onClick={() =>
                                onQuantityChange(
                                  line.productId,
                                  line.quantity + 1,
                                )
                              }
                              type="button"
                            >
                              <Plus aria-hidden="true" size={15} />
                            </button>
                          </div>
                          <strong className="public-menu-cart-line-total">
                            {money.format(
                              (product.priceInCents * line.quantity) / 100,
                            )}
                          </strong>
                        </div>
                      )}

                      {product && (
                        <label className="public-menu-cart-notes">
                          <span>Observação para a cozinha (opcional)</span>
                          <textarea
                            aria-label={`Observação para ${product.name}`}
                            disabled={isSubmitting || !canOrder}
                            maxLength={200}
                            onChange={(event) =>
                              onNotesChange(line.productId, event.target.value)
                            }
                            placeholder="Ex.: sem cebola"
                            value={line.notes ?? ""}
                          />
                        </label>
                      )}
                    </article>
                  );
                })}
              </div>

              {submitError && (
                <p className="public-menu-submit-error" role="alert">
                  {submitError}
                </p>
              )}
              {hasUnavailableProduct && !submitError && (
                <p className="public-menu-submit-error" role="status">
                  Remova os itens indisponíveis para enviar o pedido.
                </p>
              )}
              <div className="public-menu-cart-summary">
                <span>Total estimado</span>
                <strong>{money.format(totalInCents / 100)}</strong>
                <small>O valor final será confirmado pelo restaurante.</small>
              </div>
              <Button
                className="public-menu-submit-button"
                disabled={
                  !canOrder ||
                  isSubmitting ||
                  lines.length === 0 ||
                  hasUnavailableProduct
                }
                onClick={() => void onSubmit()}
                type="button"
              >
                {isSubmitting ? "Enviando pedido…" : "Enviar pedido"}
              </Button>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
