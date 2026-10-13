import {
  mapearProdutoAPI,
  mapearProdutosAPI,
} from "@/src/adapters/produtoAdapter";
import { API_ENDPOINTS } from "@/src/constants";
import type { Produto } from "@/src/types";
import type { ProdutoCreate } from "@/src/types/services";
import { processImageFile } from "@/src/utils/fileUtils";
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
 * Criar novo produto
 */
export const criarProduto = async (
  produto: ProdutoCreate
): Promise<Produto | null> => {
  try {
    let imagemBase64 = produto.imagem;

    // Se imagem é um arquivo, converter para base64 string
    if (produto.imagem instanceof File) {
      imagemBase64 = await processImageFile(produto.imagem, {
        convertToBase64: true,
      });
    }

    // Se não há imagem, não incluir o campo
    const produtoData: any = {
      nome: produto.nome,
      descricao: produto.descricao,
      preco: produto.preco,
      categoriaId: produto.categoriaId,
      disponivel: produto.disponivel,
      popular: produto.popular,
      restricoes: produto.restricoes,
    };

    // Só incluir imagem se ela existir e for válida
    if (
      imagemBase64 &&
      typeof imagemBase64 === "string" &&
      imagemBase64.length > 0
    ) {
      produtoData.imagemUrl = imagemBase64;
    }

    const response = await api.post(API_ENDPOINTS.PRODUTOS, produtoData);
    return mapearProdutoAPI(response.data);
  } catch (error) {
    console.error("Erro ao criar produto:", error);
    throw error;
  }
};

/**
 * Atualizar produto completo (PUT)
 */
export const atualizarProduto = async (
  id: string,
  produto: ProdutoCreate
): Promise<Produto | null> => {
  try {
    let imagemBase64 = produto.imagem;

    // Se imagem é um arquivo, converter para base64 string
    if (produto.imagem instanceof File) {
      imagemBase64 = await processImageFile(produto.imagem, {
        convertToBase64: true,
      });
    }

    const produtoData: any = {
      ...produto,
      imagemUrl: imagemBase64, // Enviar como string base64 no campo imagem
    };

    // Remover tempoPreparo do envio (não usado mais no frontend)
    delete produtoData.tempoPreparo;

    const response = await api.put(
      `${API_ENDPOINTS.PRODUTOS}/${id}`,
      produtoData
    );
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
 * Atualizar disponibilidade de um produto
 */
export const atualizarDisponibilidadeProduto = async (
  id: string,
  disponivel: boolean
): Promise<Produto | null> => {
  try {
    const response = await api.patch(`${API_ENDPOINTS.PRODUTOS}/${id}`, {
      disponivel,
    });
    return mapearProdutoAPI(response.data);
  } catch (error) {
    console.error("Erro ao atualizar disponibilidade do produto:", error);
    throw error;
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
