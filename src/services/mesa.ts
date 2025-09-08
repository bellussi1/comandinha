import api from "./api";
import { TokenManager } from "./tokenManager";
import { API_ENDPOINTS } from "@/src/constants";

export interface Mesa {
  id: number;
  uuid: string;
  nome: string;
  status: string;
}

interface MesaAtivacaoResponse {
  token: string;
  expiraEm: string;
  mesaId: string;
  mesaNome: string;
}

/**
 * Valida se uma mesa está ativa com um token válido
 */
export const validarToken = async (mesaId: string): Promise<boolean> => {
  try {
    console.log(`Tentando validar mesa: ${mesaId}`);

    // Verificar se já existe um token salvo para esta mesa
    const tokenSalvo = TokenManager.getToken(mesaId);

    if (tokenSalvo) {
      console.log("Token encontrado no localStorage");
      try {
        // Tentar validar usando o endpoint de validação real
        const validacaoResponse = await api.get(`${API_ENDPOINTS.MESAS}/validar`, {
          headers: { Authorization: `Bearer ${tokenSalvo}` },
        });

        console.log("Resposta de validação:", validacaoResponse.data);
        return validacaoResponse.data.valido;
      } catch (validacaoError) {
        console.log("Erro na validação com token salvo:", validacaoError);
        // Se falhar, prosseguimos para tentar ativar
      }
    }

    // Se não temos token ou validação falhou, tentar ativar a mesa
    try {
      console.log("Tentando ativar a mesa");
      const ativacaoResponse = await api.post(`${API_ENDPOINTS.MESAS}/ativar`, { mesaId });

      // Se a ativação for bem-sucedida, salvar o token e retornar válido
      if (ativacaoResponse.data && ativacaoResponse.data.token) {
        TokenManager.setToken(mesaId, ativacaoResponse.data.token);
        console.log("Mesa ativada com sucesso");
        return true;
      }
    } catch (ativacaoError) {
      console.log("Erro ao ativar mesa:", ativacaoError);
    }

    // Se chegamos aqui, tentar uma última verificação simples
    try {
      // Verificar apenas se a mesa existe usando uma listagem
      const listResponse = await api.get(API_ENDPOINTS.MESAS);
      const mesas = listResponse.data;

      // Verificar se o ID está na lista
      const mesaExiste = mesas.some(
        (mesa: any) =>
          mesa.id.toString() === mesaId.toString() || mesa.nome === mesaId
      );

      console.log(`Mesa ${mesaId} existe na listagem: ${mesaExiste}`);
      return mesaExiste;
    } catch (listError) {
      console.log("Erro ao listar mesas:", listError);
    }

    // Se todas as tentativas falharam, a mesa é inválida
    return false;
  } catch (error) {
    console.error("Erro geral ao validar mesa:", error);
    return false;
  }
};

/**
 * Atualiza o token de uma mesa
 */
export const refreshToken = async (
  mesaId: string
): Promise<MesaAtivacaoResponse | null> => {
  try {
    const response = await api.post(`${API_ENDPOINTS.MESAS}/${mesaId}/refresh`);
    const data = response.data;

    // Atualizar token usando TokenManager
    TokenManager.setToken(mesaId, data.token);

    return data;
  } catch (error) {
    console.error("Erro ao atualizar token:", error);
    return null;
  }
};

/**
 * Fecha a conta de uma mesa
 */
export const fecharConta = async (mesaId: string, formaPagamento: string) => {
  try {
    const response = await api.post(`${API_ENDPOINTS.MESAS}/${mesaId}/fechar`, {
      formaPagamento,
    });

    // Remover token usando TokenManager
    TokenManager.removeToken(mesaId);

    return response.data;
  } catch (error) {
    console.error("Erro ao fechar conta:", error);
    throw new Error("Não foi possível fechar a conta");
  }
};

/**
 * Busca todas as mesas disponíveis
 */
export const getMesas = async (): Promise<Mesa[]> => {
  try {
    const response = await api.get(API_ENDPOINTS.MESAS);
    return response.data;
  } catch (error) {
    console.error("Erro ao buscar mesas:", error);
    return [];
  }
};

/**
 * Busca uma mesa específica pelo UUID
 */
export const getMesaPorUuid = async (uuid: string): Promise<Mesa | null> => {
  try {
    const response = await api.get(`${API_ENDPOINTS.MESAS}/uuid/${uuid}`);
    return response.data;
  } catch (error) {
    console.error("Erro ao buscar mesa por UUID:", error);
    return null;
  }
};
