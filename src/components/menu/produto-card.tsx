import { Badge } from "@/src/components/ui/badge";
import { Card, CardContent } from "@/src/components/ui/card";
import { Clock, Star } from "lucide-react";
import Image from "next/image";
import type { Produto } from "@/src/types";

interface ProdutoCardProps {
  produto: Produto;
  onSelect: (produto: Produto) => void;
}

export function ProdutoCard({ produto, onSelect }: ProdutoCardProps) {
  return (
    <Card
      className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
      onClick={() => onSelect(produto)}
    >
      <div className="relative h-48">
        <Image
          src={(produto.imagem?.trimEnd()) || "/placeholder.svg"}
          alt={produto.nome}
          fill
          className="object-cover"
        />
        {produto.popular && (
          <Badge className="absolute top-2 right-2 bg-primary">
            <Star className="h-3 w-3 mr-1" /> Popular
          </Badge>
        )}
      </div>
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-2">
          <h3 className="font-semibold">{produto.nome}</h3>
          <span className="font-bold text-primary">
            R$ {produto.preco.toFixed(2).replace(".", ",")}
          </span>
        </div>
        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
          {produto.descricao}
        </p>
        <div className="flex items-center text-xs text-muted-foreground">
          <Clock className="h-3 w-3 mr-1" />
          {produto.tempoPreparo} min
          {produto.restricoes && produto.restricoes.length > 0 && (
            <div className="flex ml-3 gap-1">
              {produto.restricoes.includes("vegetariano") && (
                <Badge variant="outline" className="text-xs px-1 h-5">
                  Veg
                </Badge>
              )}
              {produto.restricoes.includes("sem gluten") && (
                <Badge variant="outline" className="text-xs px-1 h-5">
                  S/G
                </Badge>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
