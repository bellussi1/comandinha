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
 * Converte File para base64 string completa (com prefixo data:)
 */
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    console.log("Iniciando conversão de arquivo:", file.name, "Tamanho:", file.size);
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const result = reader.result as string;
        console.log("FileReader result recebido, tamanho:", result?.length || 0);
        if (!result || typeof result !== 'string') {
          console.error("Resultado do FileReader inválido");
          reject(new Error("Falha ao ler arquivo"));
          return;
        }
        
        // Manter o prefixo data:image/*;base64, completo
        console.log("Base64 completo gerado, tamanho:", result.length);
        
        if (!result || result.length === 0) {
          console.error("Base64 vazio");
          reject(new Error("Base64 vazio"));
          return;
        }
        
        resolve(result);
      } catch (error) {
        console.error("Erro ao processar resultado do FileReader:", error);
        reject(error);
      }
    };
    reader.onerror = (error) => {
      console.error("Erro no FileReader:", error);
      reject(error);
    };
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
    let imagemBase64 = produto.imagem;

    // Se imagem é um arquivo, converter para base64 string
    if (produto.imagem instanceof File) {
      console.log("Convertendo arquivo para base64:", produto.imagem.name);
      imagemBase64 = await fileToBase64(produto.imagem);
      console.log("Base64 gerado, tamanho:", imagemBase64?.length || 0);
    }

    // Se não há imagem, não incluir o campo
    const produtoData: any = {
      nome: produto.nome,
      descricao: produto.descricao,
      preco: produto.preco,
      categoriaId: produto.categoriaId,
      popular: produto.popular,
      tempoPreparo: produto.tempoPreparo,
      restricoes: produto.restricoes,
    };

    // Só incluir imagem se ela existir e for válida
    if (imagemBase64 && typeof imagemBase64 === 'string' && imagemBase64.length > 0) {
      produtoData.imagemUrl = imagemBase64;
      console.log("Incluindo imagem na requisição");
    } else {
      console.log("Nenhuma imagem válida para enviar");
    }

    console.log("Dados que serão enviados:", { ...produtoData, imagemUrl: produtoData.imagemUrl ? '[BASE64_DATA]' : undefined });

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
export const atualizarProduto = async (id: string, produto: ProdutoCreate): Promise<Produto | null> => {
  try {
    let imagemBase64 = produto.imagem;

    // Se imagem é um arquivo, converter para base64 string
    if (produto.imagem instanceof File) {
      imagemBase64 = await fileToBase64(produto.imagem);
    }

    const produtoData = {
      ...produto,
      imagemUrl: imagemBase64 // Enviar como string base64 no campo imagem
    };

    const response = await api.put(`${API_ENDPOINTS.PRODUTOS}/${id}`, produtoData);
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
