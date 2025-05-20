"use client";

import { ThemeToggle } from "@/src/components/theme-toggle";
import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import { Card, CardContent } from "@/src/components/ui/card";
import { Toaster } from "@/src/components/ui/toaster";
import { useToast } from "@/src/components/ui/use-toast";
import { getPedidosPorMesa } from "@/src/services/pedidos";
import { ItemCarrinho, Pedido } from "@/src/types";
import {
  ArrowLeft,
  CheckCircle,
  Clock,
  Loader2,
  ShoppingBag,
  Utensils,
  X,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function PedidosPage() {
  const params = useParams();
  const { token } = params as { token: string };
  const { toast } = useToast();

  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function carregarPedidos() {
      if (!token) return;

      try {
        setLoading(true);
        setError(null);
        const pedidosData = await getPedidosPorMesa(token);
        setPedidos(pedidosData);
      } catch (error) {
        console.error("Erro ao carregar pedidos:", error);
        setError("Não foi possível carregar os pedidos. Tente novamente.");
        toast({
          title: "Erro",
          description: "Não foi possível carregar os pedidos. Tente novamente.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    }

    carregarPedidos();

    // Atualizar pedidos periodicamente
    const intervalId = setInterval(carregarPedidos, 30000); // Atualiza a cada 30s
    return () => clearInterval(intervalId);
  }, [token, toast]);

  // Formatação da hora do pedido (HH:MM)
  const formatarHora = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Formatação completa da data e hora
  const formatarDataCompleta = (timestamp: number) => {
    return new Date(timestamp).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Cálculo do total de um pedido
  const calcularTotalPedido = (itens: ItemCarrinho[]) => {
    return itens.reduce(
      (total, item) => total + item.preco * item.quantidade,
      0
    );
  };

  // Ícone do status do pedido
  const getStatusIcon = (status: Pedido["status"]) => {
    switch (status) {
      case "confirmado":
        return <CheckCircle className="h-5 w-5 text-blue-500" />;
      case "preparando":
        return <Utensils className="h-5 w-5 text-orange-500" />;
      case "entregue":
        return <ShoppingBag className="h-5 w-5 text-green-500" />;
      default:
        return <Clock className="h-5 w-5 text-gray-500" />;
    }
  };

  // Badge do status do pedido
  const getStatusBadge = (status: Pedido["status"]) => {
    switch (status) {
      case "confirmado":
        return <Badge className="bg-blue-500">Confirmado</Badge>;
      case "preparando":
        return <Badge className="bg-orange-500">Em preparo</Badge>;
      case "entregue":
        return <Badge className="bg-green-500">Entregue</Badge>;
      default:
        return <Badge className="bg-gray-500">Desconhecido</Badge>;
    }
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
          <div className="flex items-center gap-3">
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Conteúdo principal */}
      <main className="flex-1 container mx-auto px-4 py-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Carregando seus pedidos...</p>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <div className="mx-auto w-16 h-16 mb-4 text-destructive">
              <X className="w-16 h-16" />
            </div>
            <h2 className="text-xl font-bold mb-2">Erro ao carregar pedidos</h2>
            <p className="text-muted-foreground mb-6">{error}</p>
            <Button onClick={() => window.location.reload()}>
              Tentar novamente
            </Button>
          </div>
        ) : pedidos.length > 0 ? (
          <div className="space-y-6">
            {pedidos
              .slice()
              .sort((a, b) => b.timestamp - a.timestamp) // Ordena do mais recente para o mais antigo
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
                      {formatarDataCompleta(pedido.timestamp)}
                    </div>

                    {pedido.observacoesGerais && (
                      <div className="bg-muted p-3 rounded-md mb-4 text-sm">
                        <p className="font-medium mb-1">Observações:</p>
                        <p>{pedido.observacoesGerais}</p>
                      </div>
                    )}

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
                            {item.observacoes && (
                              <p className="text-xs text-muted-foreground ml-5">
                                {item.observacoes}
                              </p>
                            )}
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
                        {calcularTotalPedido(pedido.itens)
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

      <Toaster />
    </div>
  );
}
