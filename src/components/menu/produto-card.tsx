import React from "react";
import { Badge } from "@/src/components/ui/badge";
import { Card, CardContent } from "@/src/components/ui/card";
import { Clock, Star } from "lucide-react";
import type { Produto } from "@/src/types";
import { ProductImage } from "@/src/utils/imageUtils";
import { formatarMoeda } from "@/src/utils/formatters";
import { DIETARY_RESTRICTIONS_CONFIG } from "@/src/constants/dietaryRestrictions";

interface ProdutoCardProps {
  produto: Produto;
  onSelect: (produto: Produto) => void;
}

function ProdutoCardComponent({ produto, onSelect }: ProdutoCardProps) {
  return (
    <Card
      className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
      onClick={() => onSelect(produto)}
      role="button"
      tabIndex={0}
      aria-label={`Ver detalhes de ${produto.nome}, ${formatarMoeda(produto.preco)}`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(produto);
        }
      }}
    >
      <div className="relative h-48">
        <ProductImage
          src={produto.imagem}
          alt={`Imagem de ${produto.nome}`}
          className="absolute inset-0 w-full h-full object-cover"
          fill
        />
        {produto.popular && (
          <Badge className="absolute top-2 right-2 bg-primary text-primary-foreground shadow-md" aria-label="Produto popular">
            <Star className="h-3 w-3 mr-1 fill-current" aria-hidden="true" /> Popular
          </Badge>
        )}
      </div>
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-2">
          <h3 className="font-semibold">{produto.nome}</h3>
          <span className="font-bold text-primary" aria-label={`Preço: ${formatarMoeda(produto.preco)}`}>
            {formatarMoeda(produto.preco)}
          </span>
        </div>
        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
          {produto.descricao}
        </p>
        <div className="flex items-center text-xs text-muted-foreground">
          <Clock className="h-3 w-3 mr-1" aria-hidden="true" />
          <span aria-label={`Tempo de preparo: ${produto.tempoPreparo} minutos`}>
            {produto.tempoPreparo} min
          </span>
          {produto.restricoes && produto.restricoes.length > 0 && (
            <div className="flex ml-3 gap-1 flex-wrap" role="list" aria-label="Restrições alimentares">
              {produto.restricoes.map((restricao) => {
                const restricaoConfig = DIETARY_RESTRICTIONS_CONFIG[restricao as keyof typeof DIETARY_RESTRICTIONS_CONFIG];

                return restricaoConfig ? (
                  <Badge key={restricao} variant="outline" className="text-xs px-1 h-5 flex items-center gap-1" role="listitem">
                    <span className="text-[10px]" aria-hidden="true">{restricaoConfig.emoji}</span>
                    {restricaoConfig.label}
                  </Badge>
                ) : null;
              })}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Memoize component to prevent unnecessary re-renders when props haven't changed
export const ProdutoCard = React.memo(ProdutoCardComponent, (prevProps, nextProps) => {
  // Custom comparison for better performance
  return (
    prevProps.produto.id === nextProps.produto.id &&
    prevProps.produto.nome === nextProps.produto.nome &&
    prevProps.produto.preco === nextProps.produto.preco &&
    prevProps.produto.disponivel === nextProps.produto.disponivel &&
    prevProps.onSelect === nextProps.onSelect
  );
});
