import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import { Clock, Minus, Plus, X } from "lucide-react";
import { useEffect, useState } from "react";
import type { Produto } from "@/src/types";
import { ProductImage } from "@/src/utils/imageUtils";
import { formatarMoeda } from "@/src/utils/formatters";
import { DIETARY_RESTRICTIONS_CONFIG } from "@/src/constants/dietaryRestrictions";

interface ModalProdutoProps {
  produto: Produto | null;
  isOpen: boolean;
  onClose: () => void;
  onAddToCart: (
    produto: Produto,
    quantidade: number,
    observacoes: string
  ) => void;
}

export function ModalProduto({
  produto,
  isOpen,
  onClose,
  onAddToCart,
}: ModalProdutoProps) {
  const [quantidade, setQuantidade] = useState(1);
  const [observacoes, setObservacoes] = useState("");

  useEffect(() => {
    if (isOpen && produto) {
      setQuantidade(1);
      setObservacoes("");
    }
  }, [isOpen, produto]);

  if (!isOpen || !produto) return null;

  const incrementarQuantidade = () => setQuantidade((prev) => prev + 1);
  const decrementarQuantidade = () =>
    setQuantidade((prev) => Math.max(1, prev - 1));

  const handleAddToCart = () => {
    onAddToCart(produto, quantidade, observacoes.trim());
    onClose();
  };

  return (
    <div
      className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-produto-titulo"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-background w-full max-w-md rounded-t-lg sm:rounded-lg shadow-lg overflow-hidden max-h-[90vh] flex flex-col">
        <div className="relative h-64">
          <ProductImage
            src={produto.imagem}
            alt={`Imagem de ${produto.nome}`}
            className="absolute inset-0 w-full h-full object-cover"
            fill
          />
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 rounded-full bg-background/50 hover:bg-background/70"
            onClick={onClose}
            aria-label="Fechar modal"
          >
            <X className="h-5 w-5" aria-hidden="true" />
            <span className="sr-only">Fechar</span>
          </Button>
        </div>

        <div className="p-4 overflow-y-auto flex-1">
          <div className="flex justify-between items-start mb-2">
            <h3 id="modal-produto-titulo" className="text-xl font-bold">{produto.nome}</h3>
            <span className="font-bold text-primary text-lg" aria-label={`Preço: ${formatarMoeda(produto.preco)}`}>
              {formatarMoeda(produto.preco)}
            </span>
          </div>

          <p className="text-muted-foreground mb-4">{produto.descricao}</p>

          <div className="flex items-center text-sm text-muted-foreground mb-6">
            <Clock className="h-4 w-4 mr-1" aria-hidden="true" />
            <span aria-label={`Tempo de preparo: ${produto.tempoPreparo} minutos`}>
              {produto.tempoPreparo} min
            </span>
            {produto.restricoes && produto.restricoes.length > 0 && (
              <div className="flex ml-3 gap-1 flex-wrap" role="list" aria-label="Restrições alimentares">
                {produto.restricoes.map((restricao) => {
                  const restricaoConfig = DIETARY_RESTRICTIONS_CONFIG[restricao as keyof typeof DIETARY_RESTRICTIONS_CONFIG];

                  return restricaoConfig ? (
                    <Badge key={restricao} variant="outline" className="flex items-center gap-1" role="listitem">
                      <span aria-hidden="true">{restricaoConfig.emoji}</span>
                      {restricaoConfig.nome}
                    </Badge>
                  ) : null;
                })}
              </div>
            )}
          </div>

          <div className="mb-4">
            <label
              htmlFor="observacoes"
              className="block text-sm font-medium mb-2"
            >
              Observações
            </label>
            <textarea
              id="observacoes"
              className="w-full p-3 border rounded-md h-24 bg-background"
              placeholder="Ex: Sem cebola, molho à parte..."
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
            />
          </div>

          <div className="flex items-center justify-between mb-6">
            <span className="font-medium" id="quantidade-label">Quantidade</span>
            <div className="flex items-center gap-3" role="group" aria-labelledby="quantidade-label">
              <Button
                variant="outline"
                size="icon"
                onClick={decrementarQuantidade}
                disabled={quantidade <= 1}
                aria-label="Diminuir quantidade"
              >
                <Minus className="h-4 w-4" aria-hidden="true" />
              </Button>
              <span className="w-8 text-center font-medium" aria-live="polite" aria-atomic="true">
                {quantidade}
              </span>
              <Button
                variant="outline"
                size="icon"
                onClick={incrementarQuantidade}
                aria-label="Aumentar quantidade"
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
          </div>

          <div className="flex justify-between items-center font-bold text-lg mb-4">
            <span>Total</span>
            <span className="text-primary" aria-live="polite" aria-atomic="true" aria-label={`Total: ${formatarMoeda(produto.preco * quantidade)}`}>
              {formatarMoeda(produto.preco * quantidade)}
            </span>
          </div>
        </div>

        <div className="p-4 border-t">
          <Button className="w-full" onClick={handleAddToCart}>
            Adicionar ao pedido
          </Button>
        </div>
      </div>
    </div>
  );
}
