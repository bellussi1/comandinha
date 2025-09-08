// src/app/mesa/[token]/pedidos/page.tsx
"use client";

import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import { Card, CardContent } from "@/src/components/ui/card";
import { ThemeToggle } from "@/src/components/theme-toggle";
import { StatusBadge } from "@/src/components/status/StatusBadge";
import { StatusIcon } from "@/src/components/status/StatusIcon";
import { ArrowLeft, Clock, Loader2, X } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { getMesaPorUuid, Mesa } from "@/src/services/mesa";
import { getPedidosPorMesaId } from "@/src/services/pedidos";
import { Pedido } from "@/src/types";
import { Toaster } from "@/src/components/ui/toaster";
import { useToast } from "@/src/components/ui/use-toast";
import { formatarDataCompleta } from "@/src/utils/formatters";

export default function PedidosPage() {
  const params = useParams();
  const { token } = params as { token: string };
  const { toast } = useToast();

  const [mesa, setMesa] = useState<Mesa | null>(null);
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function carregarDados() {
      if (!token) return;

      try {
        setLoading(true);
        setError(null);
        
        // Primeiro buscar dados da mesa pelo UUID
        const dadosMesa = await getMesaPorUuid(token);
        if (!dadosMesa) {
          throw new Error("Mesa não encontrada");
        }
        
        setMesa(dadosMesa);
        
        // Depois buscar pedidos usando o ID numérico da mesa
        const pedidosData = await getPedidosPorMesaId(dadosMesa.id.toString());
        console.log(`Pedidos carregados para mesa ${dadosMesa.nome} (ID: ${dadosMesa.id}):`, pedidosData);
        setPedidos(pedidosData);
      } catch (error) {
        console.error("Erro ao carregar dados:", error);
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

    carregarDados();

    // Atualizar dados periodicamente
    const intervalId = setInterval(carregarDados, 30000); // Atualiza a cada 30s
    return () => clearInterval(intervalId);
  }, [token, toast]);

  // Cálculo do total de um pedido
  const calcularTotalPedido = (pedido: Pedido): number => {
    return pedido.itens.reduce(
      (total, item) => total + item.preco * item.quantidade,
      0
    );
  };
  
  // Função local para formatar valores monetários
  const formatarValor = (valor: number): string => {
    return valor.toFixed(2).replace(".", ",");
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
                        <StatusIcon status={pedido.status} />
                        <h3 className="font-medium">
                          Pedido #{pedido.id.slice(-4)}
                        </h3>
                      </div>
                      <StatusBadge status={pedido.status} />
                    </div>

                    <div className="flex items-center text-sm text-muted-foreground mb-4">
                      <Clock className="h-4 w-4 mr-1" />
                      {formatarDataCompleta(
                        new Date(pedido.timestamp).toISOString()
                      )}
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
                          {item.preco > 0 ? (
                            <span>
                              R$ {formatarValor(item.preco * item.quantidade)}
                            </span>
                          ) : (
                            <span>Preço indisponível</span>
                          )}
                        </div>
                      ))}
                    </div>

                    <div className="border-t pt-3 flex justify-between items-center font-medium">
                      <span>Total</span>
                      {calcularTotalPedido(pedido) > 0 ? (
                        <span>
                          R$ {formatarValor(calcularTotalPedido(pedido))}
                        </span>
                      ) : (
                        <span>Preço indisponível</span>
                      )}
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
