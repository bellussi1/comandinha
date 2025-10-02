import api from "./api";
import { API_ENDPOINTS } from "@/src/constants";
import type { Categoria } from "@/src/types";
import type { CategoriaCreate, CategoriaUpdate } from "@/src/types/services";
import { uploadImage } from "./upload";

// Listar todas as categorias
export const getCategorias = async (): Promise<Categoria[]> => {
  try {
    const response = await api.get(API_ENDPOINTS.CATEGORIAS);

    return response.data.map((categoria: any) => ({
      id: categoria.id,
      nome: categoria.nome,
      descricao: categoria.descricao,
      imagemUrl: categoria.imagemUrl,
      ordem: categoria.ordem,
    }));
  } catch (error) {
    console.error("Erro ao buscar categorias:", error);
    return [];
  }
};

// Buscar categoria por ID
export const getCategoriaById = async (
  id: number
): Promise<Categoria | null> => {
  try {
    const response = await api.get(`${API_ENDPOINTS.CATEGORIAS}/${id}`);
    return {
      id: response.data.id,
      nome: response.data.nome,
      descricao: response.data.descricao,
      imagemUrl: response.data.imagemUrl,
      ordem: response.data.ordem,
    };
  } catch (error) {
    console.error("Erro ao buscar categoria por ID:", error);
    return null;
  }
};

// Criar nova categoria
export const criarCategoria = async (
  categoria: CategoriaCreate
): Promise<Categoria | null> => {
  try {
    let imagemUrl = categoria.imagemUrl;

    // Se imagem é um arquivo, fazer upload primeiro
    if (categoria.imagemUrl instanceof File) {
      const uploadResult = await uploadImage(categoria.imagemUrl);
      imagemUrl = uploadResult.url;
    }

    const categoriaData = {
      ...categoria,
      imagemUrl: imagemUrl,
    };

    const response = await api.post(API_ENDPOINTS.CATEGORIAS, categoriaData);
    return {
      id: response.data.id,
      nome: response.data.nome,
      descricao: response.data.descricao,
      imagemUrl: response.data.imagemUrl,
      ordem: response.data.ordem,
    };
  } catch (error) {
    console.error("Erro ao criar categoria:", error);
    throw error;
  }
};

// Atualizar categoria completa (PUT)
export const atualizarCategoria = async (
  id: number,
  categoria: CategoriaCreate
): Promise<Categoria | null> => {
  try {
    let imagemUrl = categoria.imagemUrl;

    // Se imagem é um arquivo, fazer upload primeiro
    if (categoria.imagemUrl instanceof File) {
      const uploadResult = await uploadImage(categoria.imagemUrl);
      imagemUrl = uploadResult.url;
    }

    const categoriaData = {
      ...categoria,
      imagemUrl: imagemUrl,
    };

    const response = await api.put(
      `${API_ENDPOINTS.CATEGORIAS}/${id}`,
      categoriaData
    );
    return {
      id: response.data.id,
      nome: response.data.nome,
      descricao: response.data.descricao,
      imagemUrl: response.data.imagemUrl,
      ordem: response.data.ordem,
    };
  } catch (error) {
    console.error("Erro ao atualizar categoria:", error);
    throw error;
  }
};

// Atualizar categoria parcial (PATCH)
export const atualizarCategoriaParcial = async (
  id: number,
  categoria: CategoriaUpdate
): Promise<Categoria | null> => {
  try {
    let imagemUrl = categoria.imagemUrl;

    // Se imagem é um arquivo, fazer upload primeiro
    if (categoria.imagemUrl instanceof File) {
      const uploadResult = await uploadImage(categoria.imagemUrl);
      imagemUrl = uploadResult.url;
    }

    const categoriaData = {
      ...categoria,
      imagemUrl: imagemUrl,
    };

    const response = await api.patch(
      `${API_ENDPOINTS.CATEGORIAS}/${id}`,
      categoriaData
    );
    return {
      id: response.data.id,
      nome: response.data.nome,
      descricao: response.data.descricao,
      imagemUrl: response.data.imagemUrl,
      ordem: response.data.ordem,
    };
  } catch (error) {
    console.error("Erro ao atualizar categoria:", error);
    throw error;
  }
};

// Deletar categoria
export const deletarCategoria = async (id: number): Promise<boolean> => {
  try {
    await api.delete(`${API_ENDPOINTS.CATEGORIAS}/${id}`);
    return true;
  } catch (error) {
    console.error("Erro ao deletar categoria:", error);
    throw error;
  }
};

// Verificar se categoria tem produtos
export const categoriaTemProdutos = async (
  categoriaId: number
): Promise<boolean> => {
  try {
    const response = await api.get(
      `${API_ENDPOINTS.CATEGORIAS}/${categoriaId}/produtos`
    );
    return response.data && response.data.length > 0;
  } catch (error) {
    console.error("Erro ao verificar produtos da categoria:", error);
    return false;
  }
};
