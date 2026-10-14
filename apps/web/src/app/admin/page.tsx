// src/app/admin/page.tsx
"use client";

import { AuthGuard } from "@/src/components/auth/AuthGuard";
import { StatusBadge } from "@/src/components/status/StatusBadge";
import { StatusIcon } from "@/src/components/status/StatusIcon";
import { Button } from "@/src/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/src/components/ui/card";
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
  confirmarPedido,
  iniciarPreparacaoPedido,
  listarPedidosProducao,
  marcarPedidoEntregue,
} from "@/src/services/admin";
import { getDisplayText } from "@/src/services/fechamento";
import { useAuth } from "@/src/services/auth";
import { PedidoProducao } from "@/src/types";
import { formatarDataHora } from "@/src/utils/formatters";
import {
  AlertCircle,
  Coffee,
  Loader2,
  RefreshCw,
  Search,
  Send,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

export default function AdminPage() {
  const { toast } = useToast();
  const router = useRouter();
  const { user, logout } = useAuth();

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

      // Garantir que sempre temos um array
      const pedidosArray = Array.isArray(pedidosData) ? pedidosData : [];

      setPedidos(pedidosArray);
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
  const handleUpdateStatus = async (pedidoId: number, novoStatus: string) => {
    if (!pedidoId) {
      toast({
        title: "Erro",
        description: "ID do pedido não encontrado",
        variant: "destructive",
      });
      return;
    }

    try {
      setAtualizandoStatus(pedidoId.toString());
      let sucesso = false;

      // Encontrar o pedido atual para validar
      const pedidoAtual = pedidos.find(p => p.pedidoId === pedidoId);
      const statusAtual = pedidoAtual?.status;

      // Usar as funções específicas para cada status
      switch (novoStatus) {
        case "pendente":
          sucesso = await confirmarPedido(pedidoId.toString());
          break;
        case "em preparo":
          sucesso = await iniciarPreparacaoPedido(pedidoId.toString());
          break;
        case "entregue":
          sucesso = await marcarPedidoEntregue(pedidoId.toString());
          break;
        default:
          throw new Error(`Status não reconhecido: ${novoStatus}`);
      }

      if (sucesso) {
        // Atualizar lista local
        setPedidos((prevPedidos) => {
          // Garantir que prevPedidos é um array
          const pedidosArray = Array.isArray(prevPedidos) ? prevPedidos : [];
          return pedidosArray.map((p) =>
            p.pedidoId === pedidoId ? { ...p, status: novoStatus } : p
          );
        });

        toast({
          title: "Status atualizado",
          description: `Pedido da  ${
            pedidos.find((p) => p.pedidoId === pedidoId)?.mesaNome
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

  const handleLogout = () => {
    logout();
    router.push("/admin/login");
  };

  return (
    <AuthGuard>
      <div className="container mx-auto py-8 px-4">
        <div className="flex flex-row flex-wrapitems-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Painel Administrativo
            </h1>
            <p className="text-muted-foreground">
              Gerencie os pedidos ativos do restaurante
            </p>
          </div>
          <Button variant="outline" onClick={fetchPedidos} disabled={loading}>
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Atualizar
          </Button>
        </div>

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
                <SelectItem value="pendente">{getDisplayText("pendente")}</SelectItem>
                <SelectItem value="em preparo">{getDisplayText("em preparo")}</SelectItem>
                <SelectItem value="entregue">{getDisplayText("entregue")}</SelectItem>
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
                  : "Não há pedidos ativos no momento."}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {pedidosFiltrados.map((pedido) => (
              <Card key={pedido.pedidoId} className="overflow-hidden">
                <CardHeader className="bg-muted/50">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">
                        {" "}
                        Mesa {pedido.mesaId}
                      </CardTitle>
                      <CardDescription>
                        {" "}
                        Pedido feito às {formatarDataHora(pedido.timestamp)}
                      </CardDescription>{" "}
                    </div>{" "}
                    <StatusBadge status={pedido.status} />
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      {Array.isArray(pedido.itens) && pedido.itens.map((item, idx) => (
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
                            {item.produtoAdicionais && Array.isArray(item.produtoAdicionais) &&
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

                    <div className="pt-4 border-t mt-4">
                      {/* Botões de status responsivos */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <Button
                          variant={
                            pedido.status === "pendente" ? "default" : "outline"
                          }
                          size="sm"
                          className="w-full"
                          onClick={() =>
                            pedido.pedidoId && handleUpdateStatus(pedido.pedidoId, "pendente")
                          }
                          disabled={
                            atualizandoStatus === pedido.pedidoId?.toString()
                          }
                        >
                          {atualizandoStatus === pedido.pedidoId?.toString() ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-1" />
                          ) : (
                            <StatusIcon status="confirmado" />
                          )}
                          <span className="hidden sm:inline">{getDisplayText("pendente")}</span>
                          <span className="sm:hidden">Pendente</span>
                        </Button>
                        <Button
                          variant={
                            pedido.status === "em preparo" ? "default" : "outline"
                          }
                          size="sm"
                          className="w-full"
                          onClick={() =>
                            pedido.pedidoId && handleUpdateStatus(pedido.pedidoId, "em preparo")
                          }
                          disabled={
                            atualizandoStatus === pedido.pedidoId?.toString()
                          }
                        >
                          <Coffee className="h-4 w-4 mr-1" />
                          <span className="hidden sm:inline">{getDisplayText("em preparo")}</span>
                          <span className="sm:hidden">Preparo</span>
                        </Button>
                        <Button
                          variant={
                            pedido.status === "entregue" ? "default" : "outline"
                          }
                          size="sm"
                          className="w-full"
                          onClick={() =>
                            pedido.pedidoId && handleUpdateStatus(pedido.pedidoId, "entregue")
                          }
                          disabled={
                            atualizandoStatus === pedido.pedidoId?.toString()
                          }
                        >
                          <Send className="h-4 w-4 mr-1" />
                          <span className="hidden sm:inline">{getDisplayText("entregue")}</span>
                          <span className="sm:hidden">Entregue</span>
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Toaster />
      </div>
    </AuthGuard>
  );
}
