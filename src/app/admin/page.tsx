// src/app/admin/page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  listarPedidosProducao,
  confirmarPedido,
  iniciarPreparacaoPedido,
  marcarPedidoPronto,
  marcarPedidoEntregue,
} from "@/src/services/admin";
import { PedidoProducao } from "@/src/types";
import { formatarDataHora } from "@/src/utils/formatters";
import { StatusBadge } from "@/src/components/status/StatusBadge";
import { StatusIcon } from "@/src/components/status/StatusIcon";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/src/components/ui/card";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/src/components/ui/select";
import { Toaster } from "@/src/components/ui/toaster";
import { useToast } from "@/src/components/ui/use-toast";
import {
  Clock,
  Search,
  RefreshCw,
  Coffee,
  Send,
  CheckCircle,
  AlertCircle,
  Loader2,
} from "lucide-react";

export default function AdminPage() {
  const { toast } = useToast();
  const router = useRouter();

  const [pedidos, setPedidos] = useState<PedidoProducao[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtroStatus, setFiltroStatus] = useState<string>("todos");
  const [filtroBusca, setFiltroBusca] = useState<string>("");
  const [atualizandoStatus, setAtualizandoStatus] = useState<string | null>(
    null
  );

  // Função para buscar pedidos
  const fetchPedidos = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const pedidosData = await listarPedidosProducao();
      setPedidos(pedidosData);
    } catch (error) {
      console.error("Erro ao carregar pedidos:", error);
      setError("Falha ao carregar pedidos. Verifique sua conexão.");
      toast({
        title: "Erro",
        description: "Não foi possível carregar os pedidos.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Carregar pedidos em produção
  useEffect(() => {
    fetchPedidos();

    // Atualização periódica dos pedidos
    const intervalId = setInterval(fetchPedidos, 30000);
    return () => clearInterval(intervalId);
  }, [fetchPedidos]);

  // Função para atualizar status de um pedido
  const handleUpdateStatus = async (pedidoId: string, novoStatus: string) => {
    if (!pedidoId) {
      toast({
        title: "Erro",
        description: "ID do pedido não encontrado",
        variant: "destructive",
      });
      return;
    }

    try {
      setAtualizandoStatus(pedidoId);
      let sucesso = false;

      // Usar as funções específicas para cada status
      switch (novoStatus) {
        case "confirmado":
          sucesso = await confirmarPedido(pedidoId);
          break;
        case "preparando":
          sucesso = await iniciarPreparacaoPedido(pedidoId);
          break;
        case "pronto":
          sucesso = await marcarPedidoPronto(pedidoId);
          break;
        case "entregue":
          sucesso = await marcarPedidoEntregue(pedidoId);
          break;
        default:
          throw new Error(`Status não reconhecido: ${novoStatus}`);
      }

      if (sucesso) {
        // Atualizar lista local
        setPedidos((prevPedidos) =>
          prevPedidos.map((p) =>
            p.id === pedidoId ? { ...p, status: novoStatus } : p
          )
        );

        toast({
          title: "Status atualizado",
          description: `Pedido da Mesa ${
            pedidos.find((p) => p.id === pedidoId)?.mesaNome
          } atualizado para ${novoStatus}`,
        });
      }
    } catch (error) {
      console.error("Erro ao atualizar status:", error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o status do pedido.",
        variant: "destructive",
      });
    } finally {
      setAtualizandoStatus(null);
    }
  };

  // Filtragem de pedidos (mantida como estava)
  const pedidosFiltrados = pedidos
    .filter((pedido) => {
      // Filtro de status
      if (filtroStatus !== "todos" && pedido.status !== filtroStatus) {
        return false;
      }

      // Filtro de busca (mesa ou itens)
      if (filtroBusca) {
        const termoBusca = filtroBusca.toLowerCase();
        const mesaMatch = pedido.mesaNome.toLowerCase().includes(termoBusca);
        const itensMatch = pedido.itens.some((item) =>
          item.produtoNome.toLowerCase().includes(termoBusca)
        );
        return mesaMatch || itensMatch;
      }

      return true;
    })
    .sort((a, b) => {
      // Ordenar por timestamp (mais recente primeiro)
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });

  return (
    <div className="container mx-auto py-8 px-4">
      <CardHeader className="flex flex-row items-center justify-between px-0">
        <div>
          <CardTitle className="text-2xl font-bold">
            Painel Administrativo
          </CardTitle>
          <CardDescription>
            Gerencie os pedidos em produção de todas as mesas
          </CardDescription>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={fetchPedidos} disabled={loading}>
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Atualizar
          </Button>
        </div>
      </CardHeader>

      {/* Filtros */}
      <div className="flex flex-col md:flex-row gap-4 my-6">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por mesa ou item"
              className="pl-10"
              value={filtroBusca}
              onChange={(e) => setFiltroBusca(e.target.value)}
            />
          </div>
        </div>
        <div className="w-full md:w-48">
          <Select value={filtroStatus} onValueChange={setFiltroStatus}>
            <SelectTrigger>
              <SelectValue placeholder="Filtrar por status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os status</SelectItem>
              <SelectItem value="confirmado">Confirmado</SelectItem>
              <SelectItem value="preparando">Em preparo</SelectItem>
              <SelectItem value="pronto">Pronto</SelectItem>
              <SelectItem value="entregue">Entregue</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Tabela de Pedidos */}
      {loading && !pedidos.length ? (
        <div className="flex justify-center items-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary mr-2" />
          <span>Carregando pedidos...</span>
        </div>
      ) : error ? (
        <Card className="border-destructive">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              Erro ao carregar pedidos
            </h3>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={fetchPedidos}>Tentar novamente</Button>
          </CardContent>
        </Card>
      ) : pedidosFiltrados.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center">
            <Coffee className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              Nenhum pedido encontrado
            </h3>
            <p className="text-muted-foreground">
              {filtroBusca || filtroStatus !== "todos"
                ? "Tente ajustar os filtros para ver mais resultados."
                : "Não há pedidos em produção no momento."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {pedidosFiltrados.map((pedido) => (
            <Card
              key={pedido.id || pedido.timestamp}
              className="overflow-hidden"
            >
                          <CardHeader className="bg-muted/50">                <div className="flex justify-between items-start">                  <div>                    <CardTitle className="text-lg">                      {pedido.mesaNome}                    </CardTitle>                    <CardDescription>                      Pedido feito às {formatarDataHora(pedido.timestamp)}                    </CardDescription>                  </div>                  <StatusBadge status={pedido.status} />                </div>              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    {pedido.itens.map((item, idx) => (
                      <div key={idx} className="flex justify-between">
                        <div>
                          <span className="font-medium">
                            {item.quantidade}x{" "}
                          </span>
                          <span>{item.produtoNome}</span>
                          {item.observacoes && (
                            <p className="text-xs text-muted-foreground pl-6 mt-1">
                              Obs: {item.observacoes}
                            </p>
                          )}
                          {Array.isArray(item.produtoAdicionais) &&
                            item.produtoAdicionais.length > 0 && (
                              <ul className="text-xs text-muted-foreground pl-6 mt-1">
                                {item.produtoAdicionais.map((adicional) => (
                                  <li key={adicional.id}>
                                    + {adicional.nome} (R${" "}
                                    {adicional.preco.toFixed(2)})
                                  </li>
                                ))}
                              </ul>
                            )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {pedido.observacoesGerais && (
                    <div className="mt-4 p-3 bg-muted rounded-md">
                      <p className="text-sm font-medium mb-1">Observações:</p>
                      <p className="text-sm">{pedido.observacoesGerais}</p>
                    </div>
                  )}

                  <div className="flex items-center text-sm">
                    <Clock className="h-4 w-4 mr-1 text-muted-foreground" />
                    <span className="text-muted-foreground">
                      Estimativa: {formatarDataHora(pedido.estimativaEntrega)}
                    </span>
                  </div>

                  <div className="flex gap-2 pt-4 border-t mt-4">
                    <Button
                      variant={
                        pedido.status === "confirmado" ? "default" : "outline"
                      }
                      size="sm"
                      className="flex-1"
                      onClick={() =>
                        handleUpdateStatus(pedido.id!, "confirmado")
                      }
                      disabled={atualizandoStatus === pedido.id}
                    >
                                          {atualizandoStatus === pedido.id ? (                        <Loader2 className="h-4 w-4 animate-spin mr-1" />                      ) : (                        <StatusIcon status="confirmado" />                      )}
                      Confirmar
                    </Button>
                    <Button
                      variant={
                        pedido.status === "preparando" ? "default" : "outline"
                      }
                      size="sm"
                      className="flex-1"
                      onClick={() =>
                        handleUpdateStatus(pedido.id!, "preparando")
                      }
                      disabled={atualizandoStatus === pedido.id}
                    >
                      <Coffee className="h-4 w-4 mr-1" />
                      Preparar
                    </Button>
                    <Button
                      variant={
                        pedido.status === "pronto" ? "default" : "outline"
                      }
                      size="sm"
                      className="flex-1"
                      onClick={() => handleUpdateStatus(pedido.id!, "pronto")}
                      disabled={atualizandoStatus === pedido.id}
                    >
                      <Send className="h-4 w-4 mr-1" />
                      Pronto
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Toaster />
    </div>
  );
}
