import type { Pedido } from "../types";

// Mock de pedidos para demonstração
const pedidosMock: Pedido[] = [
  {
    id: "1",
    mesa: "123",
    itens: [
      {
        id: "1",
        nome: "Hambúrguer Artesanal",
        descricao:
          "Pão brioche, 180g de carne, queijo cheddar, bacon e molho especial",
        preco: 32.9,
        categoria: "principais",
        imagem: "/placeholder.svg?height=200&width=300",
        quantidade: 2,
        observacoes: "Sem cebola",
      },
      {
        id: "2",
        nome: "Batata Frita",
        descricao: "Porção de batatas fritas crocantes com sal e orégano",
        preco: 18.9,
        categoria: "entradas",
        imagem: "/placeholder.svg?height=200&width=300",
        quantidade: 1,
      },
    ],
    timestamp: Date.now() - 1800000, // 30 minutos atrás
    status: "entregue",
  },
  {
    id: "2",
    mesa: "123",
    itens: [
      {
        id: "3",
        nome: "Refrigerante",
        descricao: "Lata 350ml",
        preco: 6.9,
        categoria: "bebidas",
        imagem: "/placeholder.svg?height=200&width=300",
        quantidade: 3,
      },
    ],
    timestamp: Date.now() - 900000, // 15 minutos atrás
    status: "em-preparo",
  },
];

export const getPedidosPorMesa = (mesa: string) => {
  return pedidosMock.filter((pedido) => pedido.mesa === mesa);
};

export const adicionarPedido = (
  pedido: Omit<Pedido, "id" | "timestamp" | "status">
) => {
  const novoPedido: Pedido = {
    ...pedido,
    id: Date.now().toString(),
    timestamp: Date.now(),
    status: "confirmado",
  };
  pedidosMock.push(novoPedido);
  return novoPedido;
};

export const atualizarStatusPedido = (
  pedidoId: string,
  novoStatus: Pedido["status"]
) => {
  const pedido = pedidosMock.find((p) => p.id === pedidoId);
  if (pedido) {
    pedido.status = novoStatus;
    return true;
  }
  return false;
};
