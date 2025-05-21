// src/contexts/CarrinhoContext.tsx
import React, { createContext, useContext, useState, useEffect } from "react";
import { ItemCarrinho } from "@/src/types";
import * as carrinhoService from "@/src/services/carrinho";
import { calcularTotalItems } from "@/src/utils/calculadores";

type CarrinhoContextType = {
  items: ItemCarrinho[];
  totalItems: number;
  totalValor: number;
  adicionarItem: (item: ItemCarrinho) => void;
  removerItem: (id: string) => void;
  atualizarQuantidade: (id: string, quantidade: number) => void;
  limparCarrinho: () => void;
};

const CarrinhoContext = createContext<CarrinhoContextType | null>(null);

export function CarrinhoProvider({
  children,
  mesa,
}: {
  children: React.ReactNode;
  mesa: string;
}) {
  const [items, setItems] = useState<ItemCarrinho[]>([]);

  useEffect(() => {
    setItems(carrinhoService.getCarrinho(mesa));
  }, [mesa]);

  const totalItems = items.reduce((total, item) => total + item.quantidade, 0);
  const totalValor = calcularTotalItems(items);

  const adicionarItem = (item: ItemCarrinho) => {
    carrinhoService.adicionarItem(mesa, item);
    setItems(carrinhoService.getCarrinho(mesa));
  };

  const removerItem = (id: string) => {
    carrinhoService.removerItem(mesa, id);
    setItems(carrinhoService.getCarrinho(mesa));
  };

  const atualizarQuantidade = (id: string, quantidade: number) => {
    carrinhoService.atualizarQuantidade(mesa, id, quantidade);
    setItems(carrinhoService.getCarrinho(mesa));
  };

  const limparCarrinho = () => {
    carrinhoService.limparCarrinho(mesa);
    setItems([]);
  };

  return (
    <CarrinhoContext.Provider
      value={{
        items,
        totalItems,
        totalValor,
        adicionarItem,
        removerItem,
        atualizarQuantidade,
        limparCarrinho,
      }}
    >
      {children}
    </CarrinhoContext.Provider>
  );
}

export const useCarrinho = () => {
  const context = useContext(CarrinhoContext);
  if (!context) throw new Error("useCarrinho deve ser usado dentro de CarrinhoProvider");
  return context;
}; 