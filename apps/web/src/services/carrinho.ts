import type { ItemCarrinho } from "@/src/types";
import api from "./api";
import { API_ENDPOINTS, STORAGE_KEYS } from "../constants";
import { formatarPedidoParaAPI } from "../adapters/pedidoAdapter";
import { TokenManager } from "./tokenManager";

/**
 * Obtém os itens do carrinho de uma mesa usando UUID
 */
export const getCarrinho = (mesaUuid: string): ItemCarrinho[] => {
  if (typeof window === "undefined") return [];

  const stored = localStorage.getItem(`${STORAGE_KEYS.CARRINHO_PREFIX}${mesaUuid}`);
  if (!stored) return [];

  try {
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

/**
 * Salva os itens do carrinho de uma mesa usando UUID
 */
export const salvarCarrinho = (mesaUuid: string, items: ItemCarrinho[]): void => {
  if (typeof window === "undefined") return;
  if (!mesaUuid || !Array.isArray(items)) return;

  try {
    localStorage.setItem(
      `${STORAGE_KEYS.CARRINHO_PREFIX}${mesaUuid}`,
      JSON.stringify(items)
    );
  } catch (error) {
    console.error("Erro ao salvar carrinho:", error);
  }
};

/**
 * Limpa o carrinho de uma mesa usando UUID
 */
export const limparCarrinho = (mesaUuid: string): void => {
  if (typeof window === "undefined") return;
  localStorage.removeItem(`${STORAGE_KEYS.CARRINHO_PREFIX}${mesaUuid}`);
};

/**
 * Adiciona um item ao carrinho usando UUID da mesa
 */
export const adicionarItem = (mesaUuid: string, item: ItemCarrinho): void => {
  const carrinho = getCarrinho(mesaUuid);
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

  salvarCarrinho(mesaUuid, carrinho);
};

/**
 * Remove um item do carrinho usando UUID da mesa
 */
export const removerItem = (mesaUuid: string, itemId: string): void => {
  const carrinho = getCarrinho(mesaUuid);
  const novosItens = carrinho.filter((item) => item.id !== itemId);
  salvarCarrinho(mesaUuid, novosItens);
};

/**
 * Atualiza a quantidade de um item no carrinho usando UUID da mesa
 */
export const atualizarQuantidade = (
  mesaUuid: string,
  itemId: string,
  quantidade: number
): void => {
  if (quantidade < 1) return;

  const carrinho = getCarrinho(mesaUuid);
  const itemIndex = carrinho.findIndex((item) => item.id === itemId);

  if (itemIndex >= 0) {
    carrinho[itemIndex].quantidade = quantidade;
    salvarCarrinho(mesaUuid, carrinho);
  }
};

/**
 * Envia o carrinho como um pedido para a API usando UUID da mesa
 */
export const enviarCarrinhoParaPedido = async (
  mesaUuid: string,
  observacoesGerais?: string
) => {
  const carrinho = getCarrinho(mesaUuid);
  if (carrinho.length === 0) return null;

  try {
    const payload = formatarPedidoParaAPI(mesaUuid, carrinho, observacoesGerais);
    const response = await api.post(API_ENDPOINTS.PEDIDOS, payload);

    // Limpa o carrinho após enviar o pedido
    limparCarrinho(mesaUuid);

    return response.data;
  } catch (error) {
    console.error("Erro ao enviar pedido:", error);
    throw new Error("Não foi possível enviar o pedido");
  }
};
