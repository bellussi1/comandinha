import {
  mapearProdutoAPI,
  mapearProdutosAPI,
} from "@/src/adapters/produtoAdapter";
import { API_ENDPOINTS } from "@/src/constants";
import type { Produto } from "@/src/types";
import api from "./api";

/**
 * Busca produtos
 */
export const getProdutos = async (): Promise<Produto[]> => {
  try {
    const response = await api.get(`${API_ENDPOINTS.PRODUTOS}`);
    return mapearProdutosAPI(response.data);
  } catch (error) {
    console.error("Erro ao buscar produtos:", error);
    return [];
  }
};

/**
 * Busca produtos de uma categoria específica
 */
export const getProdutosPorCategoria = async (
  categoriaId: number
): Promise<Produto[]> => {
  try {
    const response = await api.get(
      `${API_ENDPOINTS.CATEGORIAS}/${categoriaId}/produtos`
    );
    return mapearProdutosAPI(response.data);
  } catch (error) {
    console.error("Erro ao buscar produtos por categoria:", error);
    return [];
  }
};

/**
 * Busca um produto pelo ID
 */
export const getProdutoById = async (id: string): Promise<Produto | null> => {
  try {
    const response = await api.get(`${API_ENDPOINTS.PRODUTOS}/${id}`);
    return mapearProdutoAPI(response.data);
  } catch (error) {
    console.error("Erro ao buscar produto por ID:", error);
    return null;
  }
};

/**
 * Filtra produtos com base em diversos critérios
 */
export const filtrarProdutos = async ({
  categoriaId,
  vegetariano,
  semGluten,
}: {
  categoriaId: number;
  vegetariano: boolean;
  semGluten: boolean;
}): Promise<Produto[]> => {
  try {
    // Se categoria = 0, pega todos os produtos
    let produtos: Produto[] =
      categoriaId === 0
        ? await getProdutos()
        : await getProdutosPorCategoria(categoriaId);

    return produtos.filter((produto) => {
      if (
        vegetariano &&
        (!produto.restricoes || !produto.restricoes.includes("vegetariano"))
      ) {
        return false;
      }
      if (
        semGluten &&
        (!produto.restricoes || !produto.restricoes.includes("sem gluten"))
      ) {
        return false;
      }
      return true;
    });
  } catch (error) {
    console.error("Erro ao filtrar produtos:", error);
    return [];
  }
};

/**
 * Busca produtos recomendados
 */
export const getProdutosRecomendados = async (
  limite: number = 5
): Promise<Produto[]> => {
  try {
    const response = await api.get(
      `${API_ENDPOINTS.PRODUTOS}/recomendados?limite=${limite}`
    );
    return mapearProdutosAPI(response.data);
  } catch (error) {
    console.error("Erro ao buscar produtos recomendados:", error);
    return [];
  }
};
