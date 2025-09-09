import api from "./api";
import { API_ENDPOINTS } from "@/src/constants";
import type { MesaAdmin, MesaCriacaoRequest, MesaCriacaoResponse } from "@/src/types";

export const mesaAdminService = {
  /**
   * Lista todas as mesas
   */
  async listarMesas(): Promise<MesaAdmin[]> {
    try {
      const response = await api.get(API_ENDPOINTS.MESAS);
      const mesas = await Promise.all(
        response.data.map(async (mesa: any) => {
          // Verificar se a mesa tem pedidos ativos
          const temPedidos = await this.verificarPedidosMesa(mesa.id);
          
          return {
            id: mesa.id,
            uuid: mesa.uuid,
            nome: mesa.nome,
            status: temPedidos ? "em_uso" : this.mapearStatusMesa(mesa.status),
            criadaEm: mesa.criadaEm,
            atualizadaEm: mesa.atualizadaEm
          };
        })
      );
      return mesas;
    } catch (error) {
      console.error("Erro ao listar mesas:", error);
      throw new Error("Não foi possível carregar as mesas");
    }
  },

  /**
   * Cria uma nova mesa
   */
  async criarMesa(dados: MesaCriacaoRequest): Promise<MesaCriacaoResponse> {
    try {
      const response = await api.post(API_ENDPOINTS.MESAS, dados);
      return response.data;
    } catch (error) {
      console.error("Erro ao criar mesa:", error);
      throw new Error("Não foi possível criar a mesa");
    }
  },

  /**
   * Deleta uma mesa
   */
  async deletarMesa(mesaId: number): Promise<void> {
    try {
      await api.delete(`${API_ENDPOINTS.MESAS}/${mesaId}`);
    } catch (error) {
      console.error("Erro ao deletar mesa:", error);
      throw new Error("Não foi possível deletar a mesa");
    }
  },

  /**
   * Desativa uma mesa (muda status para expirada)
   */
  async desativarMesa(mesa: MesaAdmin): Promise<void> {
    try {
      // Endpoint de desativação requer autenticação e usa o ID da mesa
      await api.post(`${API_ENDPOINTS.MESAS}/${mesa.id}/desativar`);
    } catch (error: any) {
      console.error("Erro ao desativar mesa:", error);
      if (error.response?.status === 403) {
        throw new Error("Não autorizado. Verifique se você está logado como administrador.");
      }
      throw new Error("Não foi possível desativar a mesa");
    }
  },

  /**
   * Ativa uma mesa usando o UUID (permite fazer pedidos)
   */
  async ativarMesa(mesa: MesaAdmin): Promise<void> {
    try {
      // Usar o endpoint por UUID que não requer autenticação
      const response = await api.post(`${API_ENDPOINTS.MESAS}/uuid/${mesa.uuid}/ativar`);
      console.log("Mesa ativada com sucesso:", response.data);
    } catch (error: any) {
      console.error("Erro ao ativar mesa:", error);
      if (error.response?.status === 400 && error.response?.data?.detail?.includes("já está ativa")) {
        throw new Error("Mesa já está ativa");
      }
      throw new Error("Não foi possível ativar a mesa");
    }
  },

  /**
   * Atualiza o token de uma mesa (refresh)
   */
  async refreshMesa(mesaId: number): Promise<void> {
    try {
      await api.post(`${API_ENDPOINTS.MESAS}/${mesaId}/refresh`);
    } catch (error) {
      console.error("Erro ao atualizar mesa:", error);
      throw new Error("Não foi possível atualizar a mesa");
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
   * Verifica o status de uma mesa
   */
  async verificarStatusMesa(mesa: MesaAdmin): Promise<{ status: string; temPedidos: boolean }> {
    try {
      const temPedidos = await this.verificarPedidosMesa(mesa.id);
      
      if (temPedidos) {
        return { status: "em_uso", temPedidos: true };
      }
      
      // Se não tem pedidos, verificar o status atual da mesa
      const response = await api.get(`${API_ENDPOINTS.MESAS}/${mesa.id}/status`);
      return {
        status: this.mapearStatusMesa(response.data.status),
        temPedidos: false
      };
    } catch (error) {
      console.error("Erro ao verificar status da mesa:", error);
      return { status: "disponivel", temPedidos: false };
    }
  },

  /**
   * Mapeia o status da API para o formato da aplicação
   */
  mapearStatusMesa(status: string): "disponivel" | "expirada" | "em_uso" {
    if (!status) return "disponivel";
    
    const statusLower = status.toLowerCase();
    
    // Estados que indicam mesa expirada/inativa
    if (statusLower.includes("expirada") || 
        statusLower.includes("inativa") || 
        statusLower.includes("inativo") ||
        statusLower.includes("expired") ||
        statusLower.includes("disabled")) {
      return "expirada";
    }
    
    // Estados que indicam mesa ativa/disponível
    if (statusLower.includes("ativa") || 
        statusLower.includes("ativo") || 
        statusLower.includes("disponivel") ||
        statusLower.includes("livre") ||
        statusLower.includes("available")) {
      return "disponivel";
    }
    
    // Por padrão, assumir disponível
    return "disponivel";
  },

  /**
   * Obtém a cor do status para exibição
   */
  getStatusColor(status: "disponivel" | "expirada" | "em_uso"): string {
    switch (status) {
      case "disponivel":
        return "text-green-600 bg-green-100";
      case "em_uso":
        return "text-blue-600 bg-blue-100";
      case "expirada":
        return "text-red-600 bg-red-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  },

  /**
   * Obtém o texto amigável do status
   */
  getStatusText(status: "disponivel" | "expirada" | "em_uso"): string {
    switch (status) {
      case "disponivel":
        return "Disponível";
      case "em_uso":
        return "Em Uso";
      case "expirada":
        return "Expirada";
      default:
        return status;
    }
  }
};