import {
  mapearProdutoAPI,
  mapearProdutosAPI,
} from "@/src/adapters/produtoAdapter";
import { API_ENDPOINTS } from "@/src/constants";
import type { Produto } from "@/src/types";
import api from "./api";

// Tipos para as operações de produto
export interface ProdutoCreate {
  nome: string;
  descricao?: string;
  preco: number;
  categoriaId: number;
  imagem?: string | File;
  popular?: boolean;
  tempoPreparo?: number;
  restricoes?: string[];
}

/**
 * Converte File para base64 blob string
 */
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

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
 * Criar novo produto
 */
export const criarProduto = async (produto: ProdutoCreate): Promise<Produto | null> => {
  try {
    let imagemBlob = produto.imagem;

    // Se imagem é um arquivo, converter para blob base64
    if (produto.imagem instanceof File) {
      imagemBlob = await fileToBase64(produto.imagem);
    }

    const produtoData = {
      ...produto,
      imagemURL: imagemBlob
    };

    // Remove a propriedade imagem antiga para enviar imagemURL
    const { imagem, ...finalData } = produtoData;

    const response = await api.post(API_ENDPOINTS.PRODUTOS, finalData);
    return mapearProdutoAPI(response.data);
  } catch (error) {
    console.error("Erro ao criar produto:", error);
    throw error;
  }
};

/**
 * Atualizar produto completo (PUT)
 */
export const atualizarProduto = async (id: string, produto: ProdutoCreate): Promise<Produto | null> => {
  try {
    let imagemBlob = produto.imagem;

    // Se imagem é um arquivo, converter para blob base64
    if (produto.imagem instanceof File) {
      imagemBlob = await fileToBase64(produto.imagem);
    }

    const produtoData = {
      ...produto,
      imagemURL: imagemBlob
    };

    // Remove a propriedade imagem antiga para enviar imagemURL
    const { imagem, ...finalData } = produtoData;

    const response = await api.put(`${API_ENDPOINTS.PRODUTOS}/${id}`, finalData);
    return mapearProdutoAPI(response.data);
  } catch (error) {
    console.error("Erro ao atualizar produto:", error);
    throw error;
  }
};

/**
 * Deletar produto
 */
export const deletarProduto = async (id: string): Promise<boolean> => {
  try {
    await api.delete(`${API_ENDPOINTS.PRODUTOS}/${id}`);
    return true;
  } catch (error) {
    console.error("Erro ao deletar produto:", error);
    throw error;
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
