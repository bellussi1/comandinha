import api from "./api";
import { API_ENDPOINTS } from "@/src/constants";
import type {
  MesaAdmin,
  MesaCriacaoRequest,
  MesaCriacaoResponse,
  MesaListResponse
} from "@/src/types";

export const mesaAdminService = {
  /**
   * Lista todas as mesas com melhor tratamento da nova API
   */
  async listarMesas(): Promise<MesaAdmin[]> {
    try {
      const response = await api.get(API_ENDPOINTS.MESAS);
      const mesas = await Promise.all(
        response.data.map(async (mesa: MesaListResponse) => {
          // Verificar se a mesa tem pedidos ativos
          const temPedidos = await this.verificarPedidosMesa(mesa.id);

          return {
            id: mesa.id,
            uuid: mesa.uuid,
            nome: mesa.nome,
            status: temPedidos ? "em_uso" : this.mapearStatusMesa(mesa.status),
            // criadaEm e atualizadaEm não estão disponíveis na nova API
            criadaEm: undefined,
            atualizadaEm: undefined
          } as MesaAdmin;
        })
      );
      return mesas;
    } catch (error: any) {
      console.error("Erro ao listar mesas:", error);
      // Melhor tratamento de erros baseado na nova API
      if (error.response?.status === 422) {
        throw new Error("Erro de validação: " + (error.response.data?.detail || "Dados inválidos"));
      }
      throw new Error("Não foi possível carregar as mesas");
    }
  },

  /**
   * Cria uma nova mesa com melhor tratamento de erros
   */
  async criarMesa(dados: MesaCriacaoRequest): Promise<MesaCriacaoResponse> {
    try {
      const response = await api.post(API_ENDPOINTS.MESAS, dados);
      return response.data;
    } catch (error: any) {
      console.error("Erro ao criar mesa:", error);
      // Melhor tratamento de erros baseado na nova API
      if (error.response?.status === 422) {
        const detail = error.response.data?.detail;
        if (typeof detail === 'string') {
          throw new Error("Erro de validação: " + detail);
        } else if (Array.isArray(detail)) {
          const errorMsg = detail.map((e: any) => e.msg || e.message || e).join(', ');
          throw new Error("Erro de validação: " + errorMsg);
        }
        throw new Error("Dados inválidos para criação da mesa");
      }
      if (error.response?.status === 400) {
        throw new Error("Solicitação inválida: " + (error.response.data?.detail || "Verifique os dados informados"));
      }
      throw new Error("Não foi possível criar a mesa");
    }
  },

  /**
   * Deleta uma mesa com melhor tratamento de erros
   */
  async deletarMesa(mesaId: number): Promise<void> {
    try {
      await api.delete(`${API_ENDPOINTS.MESAS}/${mesaId}`);
    } catch (error: any) {
      console.error("Erro ao deletar mesa:", error);
      // Melhor tratamento de erros baseado na nova API
      if (error.response?.status === 404) {
        throw new Error("Mesa não encontrada");
      }
      if (error.response?.status === 400) {
        throw new Error("Não é possível deletar esta mesa: " + (error.response.data?.detail || "Mesa pode estar em uso"));
      }
      if (error.response?.status === 422) {
        throw new Error("Erro de validação: " + (error.response.data?.detail || "ID da mesa inválido"));
      }
      throw new Error("Não foi possível deletar a mesa");
    }
  },



  /**
   * Verifica se uma mesa tem pedidos ativos
   */
  async verificarPedidosMesa(mesaId: number): Promise<boolean> {
    try {
      // Usar o endpoint correto: /mesas/{mesa_id}/pedidos
      const response = await api.get(`${API_ENDPOINTS.MESAS}/${mesaId}/pedidos`);
      
      // Verificar diferentes estruturas de resposta possíveis
      const data = response.data;
      
      if (Array.isArray(data)) {
        // Se a resposta é um array, verificar se tem itens
        return data.length > 0;
      } else if (data && typeof data === 'object') {
        // Se é um objeto, pode ter propriedades como 'pedidos', 'items', etc.
        if (data.pedidos && Array.isArray(data.pedidos)) {
          return data.pedidos.length > 0;
        }
        if (data.items && Array.isArray(data.items)) {
          return data.items.length > 0;
        }
        // Se tem qualquer propriedade que indique pedidos
        const keys = Object.keys(data);
        if (keys.length > 0) {
          return true;
        }
      }
      
      return false;
    } catch (error) {
      // Se der erro 404, significa que não há pedidos
      if ((error as any).response?.status === 404) {
        return false;
      }
      console.error("Erro ao verificar pedidos da mesa:", error);
      return false;
    }
  },

  /**
   * Verifica o status de uma mesa usando o endpoint correto da API
   */
  async verificarStatusMesa(mesa: MesaAdmin): Promise<{ status: string; temPedidos: boolean }> {
    try {
      const temPedidos = await this.verificarPedidosMesa(mesa.id);
      
      if (temPedidos) {
        return { status: "em_uso", temPedidos: true };
      }
      
      // Verificar o status atual da mesa usando o endpoint correto
      try {
        const response = await api.get(`${API_ENDPOINTS.MESAS}/${mesa.id}/status`);
        return {
          status: this.mapearStatusMesa(response.data.status),
          temPedidos: false
        };
      } catch (statusError) {
        // Se o endpoint de status não existir, usar a listagem geral
        console.warn("Endpoint de status não disponível, usando listagem geral");
        const listResponse = await api.get(API_ENDPOINTS.MESAS);
        const mesaAtual = listResponse.data.find((m: any) => m.id === mesa.id);
        return {
          status: mesaAtual ? this.mapearStatusMesa(mesaAtual.status) : "disponivel",
          temPedidos: false
        };
      }
    } catch (error) {
      console.error("Erro ao verificar status da mesa:", error);
      return { status: "disponivel", temPedidos: false };
    }
  },

  /**
   * Mapeia o status da API para o formato da aplicação
   */
  mapearStatusMesa(status: string): "disponivel" | "em_uso" {
    if (!status) return "disponivel";

    const statusLower = status.toLowerCase();

    // Estados que indicam mesa em uso
    if (statusLower.includes("em_uso") ||
        statusLower.includes("ocupada") ||
        statusLower.includes("ocupado") ||
        statusLower.includes("busy") ||
        statusLower.includes("in_use")) {
      return "em_uso";
    }

    // Por padrão, assumir disponível
    return "disponivel";
  },

  /**
   * Obtém a cor do status para exibição
   */
  getStatusColor(status: "disponivel" | "em_uso"): string {
    switch (status) {
      case "disponivel":
        return "text-green-600 bg-green-100";
      case "em_uso":
        return "text-blue-600 bg-blue-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  },

  /**
   * Obtém o texto amigável do status
   */
  getStatusText(status: "disponivel" | "em_uso"): string {
    switch (status) {
      case "disponivel":
        return "Disponível";
      case "em_uso":
        return "Em Uso";
      default:
        return status;
    }
  }
};