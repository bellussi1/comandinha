import api from "./api";
import type { Pedido, ItemCarrinho } from "../types";

export const getPedidosPorMesa = async (mesa: string): Promise<Pedido[]> => {
  try {
    const response = await api.get(`/mesas/${mesa}/pedidos`);

    if (!Array.isArray(response.data.pedidos)) {
      return [];
    }

    return response.data.pedidos.map((pedido: any) =>
      mapearPedidoAPI(pedido, mesa)
    );
  } catch (error) {
    console.error("Erro ao buscar pedidos da mesa:", error);
    return [];
  }
};

export const adicionarPedido = async (pedido: {
  mesa: string;
  itens: ItemCarrinho[];
  observacoesGerais?: string;
}): Promise<Pedido> => {
  try {
    // Transforma os itens no formato esperado pela API
    const itensFormato = pedido.itens.map((item) => ({
      produtoId: parseInt(item.id),
      quantidade: item.quantidade,
      observacoes: item.observacoes || null,
    }));

    const payload = {
      itens: itensFormato,
      observacoesGerais: pedido.observacoesGerais || null,
    };

    const response = await api.post("/pedidos", payload, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem(
          `@comandinha:token:${pedido.mesa}`
        )}`,
      },
    });

    return mapearPedidoAPI(response.data, pedido.mesa);
  } catch (error) {
    console.error("Erro ao adicionar pedido:", error);
    throw new Error("Não foi possível realizar o pedido");
  }
};

export const atualizarStatusPedido = async (
  pedidoId: string,
  novoStatus: Pedido["status"],
  mesaId: string
): Promise<boolean> => {
  try {
    await api.patch(
      `/pedidos/${pedidoId}/status`,
      { status: novoStatus },
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem(
            `@comandinha:token:${mesaId}`
          )}`,
        },
      }
    );
    return true;
  } catch (error) {
    console.error("Erro ao atualizar status do pedido:", error);
    return false;
  }
};

function mapearPedidoAPI(pedidoAPI: any, mesaId: string): Pedido {
  return {
    id: pedidoAPI.pedidoId.toString(),
    itens: pedidoAPI.itens.map((item: any) => ({
      id: item.produtoId.toString(),
      nome: item.nome,
      descricao: "", // A API não retorna descrição no pedido
      preco: item.precoUnitario,
      categoria: "", // A API não retorna categoria no pedido
      imagem: "/placeholder.svg", // A API não retorna imagem no pedido
      quantidade: item.quantidade,
      observacoes: item.observacoes || undefined,
    })),
    timestamp: new Date(pedidoAPI.timestamp).getTime(),
    status: pedidoAPI.status,
    mesa: mesaId,
  };
}
