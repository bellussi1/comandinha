// src/contexts/CarrinhoContext.tsx
import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from "react";
import { ItemCarrinho } from "@/src/types";
import type { CarrinhoContextType } from "@/src/types/services";
import * as carrinhoService from "@/src/services/carrinho";
import { calcularTotalItems } from "@/src/utils/calculadores";

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

  // Memoize expensive calculations to prevent recalculation on every render
  const totalItems = useMemo(
    () => items.reduce((total, item) => total + item.quantidade, 0),
    [items]
  );
  
  const totalValor = useMemo(
    () => calcularTotalItems(items),
    [items]
  );

  // Memoize callback functions to prevent unnecessary re-renders in consuming components
  const adicionarItem = useCallback((item: ItemCarrinho) => {
    carrinhoService.adicionarItem(mesa, item);
    setItems(carrinhoService.getCarrinho(mesa));
  }, [mesa]);

  const removerItem = useCallback((id: string) => {
    carrinhoService.removerItem(mesa, id);
    setItems(carrinhoService.getCarrinho(mesa));
  }, [mesa]);

  const atualizarQuantidade = useCallback((id: string, quantidade: number) => {
    carrinhoService.atualizarQuantidade(mesa, id, quantidade);
    setItems(carrinhoService.getCarrinho(mesa));
  }, [mesa]);

  const limparCarrinho = useCallback(() => {
    carrinhoService.limparCarrinho(mesa);
    setItems([]);
  }, [mesa]);

  // Memoize context value to prevent unnecessary re-renders in all consuming components
  const contextValue = useMemo(
    () => ({
      items,
      totalItems,
      totalValor,
      adicionarItem,
      removerItem,
      atualizarQuantidade,
      limparCarrinho,
    }),
    [items, totalItems, totalValor, adicionarItem, removerItem, atualizarQuantidade, limparCarrinho]
  );

  return (
    <CarrinhoContext.Provider value={contextValue}>
      {children}
    </CarrinhoContext.Provider>
  );
}

export const useCarrinho = () => {
  const context = useContext(CarrinhoContext);
  if (!context) throw new Error("useCarrinho deve ser usado dentro de CarrinhoProvider");
  return context;
}; 