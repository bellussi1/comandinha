import api from "./api";
import { API_ENDPOINTS } from "@/src/constants";
import type { Categoria } from "@/src/types";

export const getCategorias = async (): Promise<Categoria[]> => {
  try {
    const response = await api.get(API_ENDPOINTS.CATEGORIAS);
    console.log("Categorias recebidas:", response.data);
    return response.data.map((categoria: any) => ({
      id: categoria.id,
      nome: categoria.nome,
      descricao: categoria.descricao,
    }));
  } catch (error) {
    console.error("Erro ao buscar categorias:", error);
    return [];
  }
};
