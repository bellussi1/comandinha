import { API_ENDPOINTS } from "@/src/constants";
import type { CustomTheme, ThemeColors } from "@/src/types";
import api from "./api";

/**
 * Busca o tema ativo do estabelecimento
 */
export const getTemaAtivo = async (): Promise<CustomTheme | null> => {
  try {
    const response = await api.get(`${API_ENDPOINTS.ADMIN}/tema/ativo`);
    return response.data;
  } catch (error) {
    console.error("Erro ao buscar tema ativo:", error);
    return null;
  }
};

/**
 * Busca todos os temas do estabelecimento
 */
export const getTemas = async (): Promise<CustomTheme[]> => {
  try {
    const response = await api.get(`${API_ENDPOINTS.ADMIN}/tema`);
    return response.data;
  } catch (error) {
    console.error("Erro ao buscar temas:", error);
    return [];
  }
};

/**
 * Cria um novo tema
 */
export const criarTema = async (tema: Omit<CustomTheme, 'id' | 'createdAt' | 'updatedAt'>): Promise<CustomTheme | null> => {
  try {
    const response = await api.post(`${API_ENDPOINTS.ADMIN}/tema`, tema);
    return response.data;
  } catch (error) {
    console.error("Erro ao criar tema:", error);
    throw error;
  }
};

/**
 * Atualiza um tema existente
 */
export const atualizarTema = async (id: string, tema: Partial<CustomTheme>): Promise<CustomTheme | null> => {
  try {
    const response = await api.put(`${API_ENDPOINTS.ADMIN}/tema/${id}`, tema);
    return response.data;
  } catch (error) {
    console.error("Erro ao atualizar tema:", error);
    throw error;
  }
};

/**
 * Ativa um tema específico (desativa os outros)
 */
export const ativarTema = async (id: string): Promise<CustomTheme | null> => {
  try {
    const response = await api.patch(`${API_ENDPOINTS.ADMIN}/tema/${id}/ativar`);
    return response.data;
  } catch (error) {
    console.error("Erro ao ativar tema:", error);
    throw error;
  }
};

/**
 * Atualiza apenas as cores de um tema
 */
export const atualizarCoresTema = async (
  id: string, 
  mode: 'light' | 'dark', 
  colors: Partial<ThemeColors>
): Promise<CustomTheme | null> => {
  try {
    const response = await api.patch(`${API_ENDPOINTS.ADMIN}/tema/${id}/cores`, {
      mode,
      colors
    });
    return response.data;
  } catch (error) {
    console.error("Erro ao atualizar cores do tema:", error);
    throw error;
  }
};

/**
 * Deleta um tema
 */
export const deletarTema = async (id: string): Promise<boolean> => {
  try {
    await api.delete(`${API_ENDPOINTS.ADMIN}/tema/${id}`);
    return true;
  } catch (error) {
    console.error("Erro ao deletar tema:", error);
    throw error;
  }
};

/**
 * Reseta para o tema padrão do sistema
 */
export const resetarTemaDefault = async (): Promise<CustomTheme | null> => {
  try {
    const response = await api.post(`${API_ENDPOINTS.ADMIN}/tema/reset-default`);
    return response.data;
  } catch (error) {
    console.error("Erro ao resetar tema:", error);
    throw error;
  }
};