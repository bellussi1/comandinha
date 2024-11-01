"use client";
import React, { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Plus, Minus, ShoppingCart, ArrowRight, Check } from "lucide-react";

const TelaBoasVindas = ({ onContinue }) => (
  <div className="min-h-screen bg-gradient-to-b from-green-500 to-green-600 flex flex-col items-center justify-center p-6 text-white">
    <h1 className="text-4xl font-bold mb-4 text-center">Bem-vindo ao</h1>
    <h2 className="text-3xl font-bold mb-8 text-center">Restaurante Virtual</h2>

    <div className="text-center mb-8">
      <p className="text-xl mb-4">Faça seu pedido de forma rápida e fácil</p>
      <p className="text-lg">
        Escolha seus pratos favoritos e nós prepararemos com todo carinho
      </p>
    </div>

    <button
      onClick={onContinue}
      className="flex items-center gap-2 bg-white text-green-600 px-8 py-4 rounded-full font-bold text-lg hover:bg-green-50 transition-colors"
    >
      Fazer Pedido
      <ArrowRight />
    </button>
  </div>
);

const ConfirmacaoPedido = ({ onClose }) => {
  React.useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 flex flex-col items-center animate-bounce">
        <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mb-4">
          <Check className="text-white" size={32} />
        </div>
        <h2 className="text-2xl font-bold mb-2">Pedido Confirmado!</h2>
        <p className="text-gray-600">Seu pedido está sendo preparado</p>
      </div>
    </div>
  );
};

const MenuAutoatendimento = () => {
  const [tela, setTela] = useState("boasVindas");
  const [carrinho, setCarrinho] = useState([]);
  const [total, setTotal] = useState(0);
  const [mostrarConfirmacao, setMostrarConfirmacao] = useState(false);

  const categorias = [
    {
      nome: "Pratos Principais",
      items: [
        {
          id: 1,
          nome: "Picanha na Brasa",
          preco: 89.9,
          descricao: "Picanha grelhada com arroz, farofa e vinagrete",
        },
        {
          id: 2,
          nome: "Filé à Parmegiana",
          preco: 69.9,
          descricao: "Filé empanado com molho de tomate e queijo",
        },
      ],
    },
    {
      nome: "Bebidas",
      items: [
        { id: 3, nome: "Refrigerante", preco: 8.9, descricao: "Lata 350ml" },
        { id: 4, nome: "Suco Natural", preco: 12.9, descricao: "500ml" },
      ],
    },
  ];

  const adicionarItem = (item) => {
    const itemExistente = carrinho.find((i) => i.id === item.id);

    if (itemExistente) {
      setCarrinho(
        carrinho.map((i) =>
          i.id === item.id ? { ...i, quantidade: i.quantidade + 1 } : i
        )
      );
    } else {
      setCarrinho([...carrinho, { ...item, quantidade: 1 }]);
    }

    setTotal(total + item.preco);
  };

  const removerItem = (item) => {
    const itemExistente = carrinho.find((i) => i.id === item.id);

    if (itemExistente.quantidade > 1) {
      setCarrinho(
        carrinho.map((i) =>
          i.id === item.id ? { ...i, quantidade: i.quantidade - 1 } : i
        )
      );
    } else {
      setCarrinho(carrinho.filter((i) => i.id !== item.id));
    }

    setTotal(total - item.preco);
  };

  const finalizarPedido = () => {
    if (carrinho.length > 0) {
      setMostrarConfirmacao(true);
      setCarrinho([]);
      setTotal(0);
    }
  };

  if (tela === "boasVindas") {
    return <TelaBoasVindas onContinue={() => setTela("menu")} />;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header fixo */}
      <div className="sticky top-0 bg-green-500 text-white p-4 shadow-md z-10">
        <div className="flex justify-between items-center">
          <h1 className="text-xl font-bold">Cardápio</h1>
          <div className="flex items-center gap-2">
            <ShoppingCart />
            <span className="font-bold">R$ {total.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Conteúdo principal */}
      <div className="p-4 pb-32">
        {categorias.map((categoria) => (
          <Card key={categoria.nome} className="mb-4">
            <CardHeader className="py-3">
              <CardTitle className="text-lg">{categoria.nome}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {categoria.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex justify-between items-center p-3 bg-white rounded-lg shadow-sm"
                  >
                    <div className="flex-1">
                      <h3 className="font-medium">{item.nome}</h3>
                      <p className="text-sm text-gray-600">{item.descricao}</p>
                      <p className="text-base font-bold mt-1">
                        R$ {item.preco.toFixed(2)}
                      </p>
                    </div>
                    <button
                      onClick={() => adicionarItem(item)}
                      className="p-2 bg-green-500 text-white rounded-full hover:bg-green-600"
                    >
                      <Plus size={20} />
                    </button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Footer fixo com carrinho */}
      {carrinho.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white shadow-lg border-t p-4">
          <div className="max-h-40 overflow-y-auto mb-4">
            {carrinho.map((item) => (
              <div
                key={item.id}
                className="flex justify-between items-center mb-2"
              >
                <div className="flex-1">
                  <h4 className="font-medium">{item.nome}</h4>
                  <p className="text-sm text-gray-600">
                    R$ {item.preco.toFixed(2)} x {item.quantidade}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => removerItem(item)}
                    className="p-1 bg-red-500 text-white rounded-full"
                  >
                    <Minus size={16} />
                  </button>
                  <span className="w-8 text-center">{item.quantidade}</span>
                  <button
                    onClick={() => adicionarItem(item)}
                    className="p-1 bg-green-500 text-white rounded-full"
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={finalizarPedido}
            className="w-full py-3 bg-green-500 text-white rounded-lg font-medium"
          >
            Finalizar Pedido • R$ {total.toFixed(2)}
          </button>
        </div>
      )}

      {/* Modal de confirmação */}
      {mostrarConfirmacao && (
        <ConfirmacaoPedido onClose={() => setMostrarConfirmacao(false)} />
      )}
    </div>
  );
};

export default MenuAutoatendimento;
