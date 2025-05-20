import type { ItemCarrinho } from "../types";
import api from "./api";

const STORAGE_PREFIX = "@comandinha:";

export const getCarrinho = (mesa: string): ItemCarrinho[] => {
  if (typeof window === "undefined") return [];

  const stored = localStorage.getItem(`${STORAGE_PREFIX}carrinho:${mesa}`);
  if (!stored) return [];

  try {
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const salvarCarrinho = (mesa: string, items: ItemCarrinho[]): void => {
  if (typeof window === "undefined") return;
  if (!mesa || !Array.isArray(items)) return;

  try {
    localStorage.setItem(
      `${STORAGE_PREFIX}carrinho:${mesa}`,
      JSON.stringify(items)
    );
  } catch (error) {
    console.error("Erro ao salvar carrinho:", error);
  }
};

export const limparCarrinho = (mesa: string): void => {
  if (typeof window === "undefined") return;
  localStorage.removeItem(`${STORAGE_PREFIX}carrinho:${mesa}`);
};

export const adicionarItem = (mesa: string, item: ItemCarrinho): void => {
  const carrinho = getCarrinho(mesa);
  const itemExistente = carrinho.findIndex((i) => i.id === item.id);

  if (itemExistente >= 0) {
    carrinho[itemExistente].quantidade += item.quantidade;

    // Se tiver observações, atualizar
    if (item.observacoes) {
      carrinho[itemExistente].observacoes = item.observacoes;
    }
  } else {
    carrinho.push(item);
  }

  salvarCarrinho(mesa, carrinho);
};

export const removerItem = (mesa: string, itemId: string): void => {
  const carrinho = getCarrinho(mesa);
  const novosItens = carrinho.filter((item) => item.id !== itemId);
  salvarCarrinho(mesa, novosItens);
};

export const atualizarQuantidade = (
  mesa: string,
  itemId: string,
  quantidade: number
): void => {
  if (quantidade < 1) return;

  const carrinho = getCarrinho(mesa);
  const itemIndex = carrinho.findIndex((item) => item.id === itemId);

  if (itemIndex >= 0) {
    carrinho[itemIndex].quantidade = quantidade;
    salvarCarrinho(mesa, carrinho);
  }
};

// Novas funções para sincronização com a API (opcional, depende da necessidade)
export const enviarCarrinhoParaPedido = async (
  mesa: string,
  observacoesGerais?: string
) => {
  const carrinho = getCarrinho(mesa);
  if (carrinho.length === 0) return null;

  // Chama o serviço de pedidos para enviar o pedido
  try {
    const response = await api.post("/pedidos", {
      itens: carrinho.map((item) => ({
        produtoId: parseInt(item.id),
        quantidade: item.quantidade,
        observacoes: item.observacoes || null,
      })),
      observacoesGerais: observacoesGerais || null,
    });

    // Limpa o carrinho após enviar o pedido
    limparCarrinho(mesa);

    return response.data;
  } catch (error) {
    console.error("Erro ao enviar pedido:", error);
    throw new Error("Não foi possível enviar o pedido");
  }
};
