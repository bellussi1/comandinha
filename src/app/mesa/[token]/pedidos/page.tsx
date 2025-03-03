"use client";

import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import { Card, CardContent } from "@/src/components/ui/card";
import { ItemCarrinho, Pedido } from "@/src/types";
import {
  ArrowLeft,
  CheckCircle,
  Clock,
  ShoppingBag,
  Utensils,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { getPedidosPorMesa } from "@/src/services/pedidos";

export default function PedidosPage() {
  const params = useParams();
  const { token } = params;

  const [pedidos, setPedidos] = useState<Pedido[]>([]);

  // Carregar pedidos do localStorage
  useEffect(() => {
    if (typeof token === "string") {
      const pedidosMesa = getPedidosPorMesa(token);
      setPedidos(pedidosMesa);
    }
  }, [token]);

  // Salvar pedidos no localStorage quando atualizados
  useEffect(() => {
    localStorage.setItem(`pedidos-${token}`, JSON.stringify(pedidos));
  }, [pedidos, token]);

  const formatarData = (timestamp: number) => {
    return new Date(timestamp).toLocaleString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatarData2 = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusBadge = (status: Pedido["status"]) => {
    switch (status) {
      case "confirmado":
        return <Badge className="bg-blue-500">Confirmado</Badge>;
      case "em-preparo":
        return <Badge className="bg-orange-500">Em preparo</Badge>;
      case "entregue":
        return <Badge className="bg-green-500">Entregue</Badge>;
      default:
        return null;
    }
  };

  const getStatusIcon = (status: Pedido["status"]) => {
    switch (status) {
      case "confirmado":
        return <CheckCircle className="h-5 w-5 text-blue-500" />;
      case "em-preparo":
        return <Utensils className="h-5 w-5 text-orange-500" />;
      case "entregue":
        return <ShoppingBag className="h-5 w-5 text-green-500" />;
      default:
        return null;
    }
  };

  const calcularTotalPedido = (itens: ItemCarrinho[]) => {
    return itens.reduce(
      (total, item) => total + item.preco * item.quantidade,
      0
    );
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background border-b">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" asChild>
              <Link href={`/mesa/${token}`}>
                <ArrowLeft className="h-5 w-5" />
                <span className="sr-only">Voltar</span>
              </Link>
            </Button>
            <h1 className="font-bold text-lg">Seus pedidos</h1>
          </div>
        </div>
      </header>

      {/* Conteúdo principal */}
      <main className="flex-1 container mx-auto px-4 py-6">
        {pedidos.length > 0 ? (
          <div className="space-y-6">
            {pedidos
              .slice()
              .reverse()
              .map((pedido) => (
                <Card key={pedido.id} className="overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-center mb-3">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(pedido.status)}
                        <h3 className="font-medium">
                          Pedido #{pedido.id.slice(-4)}
                        </h3>
                      </div>
                      {getStatusBadge(pedido.status)}
                    </div>

                    <div className="flex items-center text-sm text-muted-foreground mb-4">
                      <Clock className="h-4 w-4 mr-1" />
                      {formatarData2(pedido.timestamp)}
                    </div>

                    <div className="space-y-2 mb-4">
                      {pedido.itens.map((item, index) => (
                        <div
                          key={index}
                          className="flex justify-between items-center"
                        >
                          <div>
                            <span className="font-medium">
                              {item.quantidade}x{" "}
                            </span>
                            <span>{item.nome}</span>
                          </div>
                          <span>
                            R${" "}
                            {(item.preco * item.quantidade)
                              .toFixed(2)
                              .replace(".", ",")}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="border-t pt-3 flex justify-between items-center font-medium">
                      <span>Total</span>
                      <span>
                        R${" "}
                        {(calcularTotalPedido(pedido.itens) * 1.1)
                          .toFixed(2)
                          .replace(".", ",")}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="mx-auto w-16 h-16 mb-4 text-muted-foreground">
              <Clock className="w-16 h-16" />
            </div>
            <h2 className="text-xl font-bold mb-2">Nenhum pedido realizado</h2>
            <p className="text-muted-foreground mb-6">
              Faça seu primeiro pedido para acompanhar o status aqui
            </p>
            <Button asChild>
              <Link href={`/mesa/${token}`}>Ver cardápio</Link>
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}
