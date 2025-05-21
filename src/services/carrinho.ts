import type { ItemCarrinho } from "@/src/types";
import api from "./api";
import { API_ENDPOINTS, STORAGE_KEYS } from "../constants";
import { formatarPedidoParaAPI } from "../adapters/pedidoAdapter";
import { TokenManager } from "./tokenManager";

/**
 * Obtém os itens do carrinho de uma mesa
 */
export const getCarrinho = (mesa: string): ItemCarrinho[] => {
  if (typeof window === "undefined") return [];

  const stored = localStorage.getItem(`${STORAGE_KEYS.CARRINHO_PREFIX}${mesa}`);
  if (!stored) return [];

  try {
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

/**
 * Salva os itens do carrinho de uma mesa
 */
export const salvarCarrinho = (mesa: string, items: ItemCarrinho[]): void => {
  if (typeof window === "undefined") return;
  if (!mesa || !Array.isArray(items)) return;

  try {
    localStorage.setItem(
      `${STORAGE_KEYS.CARRINHO_PREFIX}${mesa}`,
      JSON.stringify(items)
    );
  } catch (error) {
    console.error("Erro ao salvar carrinho:", error);
  }
};

/**
 * Limpa o carrinho de uma mesa
 */
export const limparCarrinho = (mesa: string): void => {
  if (typeof window === "undefined") return;
  localStorage.removeItem(`${STORAGE_KEYS.CARRINHO_PREFIX}${mesa}`);
};

/**
 * Adiciona um item ao carrinho
 */
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

/**
 * Remove um item do carrinho
 */
export const removerItem = (mesa: string, itemId: string): void => {
  const carrinho = getCarrinho(mesa);
  const novosItens = carrinho.filter((item) => item.id !== itemId);
  salvarCarrinho(mesa, novosItens);
};

/**
 * Atualiza a quantidade de um item no carrinho
 */
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

/**
 * Envia o carrinho como um pedido para a API
 */
export const enviarCarrinhoParaPedido = async (
  mesa: string,
  observacoesGerais?: string
) => {
  const carrinho = getCarrinho(mesa);
  if (carrinho.length === 0) return null;

  try {
    const payload = formatarPedidoParaAPI(mesa, carrinho, observacoesGerais);
    const response = await api.post(API_ENDPOINTS.PEDIDOS, payload);

    // Limpa o carrinho após enviar o pedido
    limparCarrinho(mesa);

    return response.data;
  } catch (error) {
    console.error("Erro ao enviar pedido:", error);
    throw new Error("Não foi possível enviar o pedido");
  }
};
