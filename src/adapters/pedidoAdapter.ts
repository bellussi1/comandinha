import type { Pedido, PedidoAPI, ItemPedidoAPI } from "@/src/types";

/**
 * Mapeia um pedido da API para o formato usado na aplicação
 */
export function mapearPedidoAPI(pedidoAPI: PedidoAPI, mesaUuid: string): Pedido {
  return {
    id: pedidoAPI.pedidoId.toString(),
    itens: mapearItensPedidoAPI(pedidoAPI.itens),
    timestamp: new Date(pedidoAPI.timestamp).getTime(),
    status: pedidoAPI.status as any,
    mesa: mesaUuid,
    observacoesGerais: pedidoAPI.observacoesGerais || undefined,
  };
}

/**
 * Mapeia os itens de um pedido da API
 */
export function mapearItensPedidoAPI(itens: ItemPedidoAPI[]) {
  return itens.map((item: ItemPedidoAPI) => ({
    id: item.produtoId.toString(),
    nome: item.nome,
    descricao: "", // A API não retorna descrição no pedido
    preco: item.precoUnitario,
    categoria: "", // A API não retorna categoria no pedido
    imagem: "/placeholder.svg", // A API não retorna imagem no pedido
    disponivel: true, // Assumir que produtos em pedidos estão disponíveis
    quantidade: item.quantidade,
    observacoes: item.observacoes || undefined,
  }));
}

/**
 * Formata um pedido para envio à API
 */
export function formatarPedidoParaAPI(mesaUuid: string, itens: any[], observacoesGerais?: string) {
  return {
    uuid: mesaUuid, // A API espera o campo 'uuid'
    itens: itens.map(item => ({
      produtoId: parseInt(item.id),
      quantidade: item.quantidade,
      observacoes: item.observacoes || null,
    })),
    observacoesGerais: observacoesGerais || null,
  };
} 