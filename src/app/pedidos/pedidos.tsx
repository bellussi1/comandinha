"use client";

import { ThemeToggle } from "@/src/components/theme-toggle";
import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import { Card, CardContent } from "@/src/components/ui/card";
import { Input } from "@/src/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/src/components/ui/select";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/src/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger } from "@/src/components/ui/tabs";
import { Toaster } from "@/src/components/ui/toaster";
import { useToast } from "@/src/components/ui/use-toast";
import api from "@/src/services/api";
import { atualizarStatusPedido, getPedidosPorMesaId } from "@/src/services/pedidos";
import type { Pedido } from "@/src/types";
import {
  ArrowLeft,
  CheckCircle,
  Clock,
  Loader2,
  Search,
  ShoppingBag,
  SlidersHorizontal,
  Utensils,
  X,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function PedidosGlobalPage() {
  const { toast } = useToast();
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [filteredPedidos, setFilteredPedidos] = useState<Pedido[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("todos");
  const [dateFilter, setDateFilter] = useState<string>("todos");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Carregar todos os pedidos de todas as mesas
  useEffect(() => {
    async function carregarTodosPedidos() {
      try {
        setLoading(true);
        setError(null);

        // Buscar todas as mesas
        const mesasResponse = await api.get("/mesas");
        const mesas = mesasResponse.data;

        const allPedidos: Pedido[] = [];

        // Para cada mesa, buscar os pedidos usando a função que filtra pelo ID da mesa
        for (const mesa of mesas) {
          try {
            const pedidosDaMesa = await getPedidosPorMesaId(mesa.id.toString());
            
            // Adicionar os pedidos encontrados ao array geral
            if (pedidosDaMesa.length > 0) {
              allPedidos.push(...pedidosDaMesa);
            }
          } catch (error) {
            console.error(`Erro ao buscar pedidos da mesa ${mesa.id}:`, error);
          }
        }

        // Ordenar por timestamp (mais recente primeiro)
        allPedidos.sort((a, b) => b.timestamp - a.timestamp);

        setPedidos(allPedidos);
        setFilteredPedidos(allPedidos);
      } catch (error) {
        console.error("Erro ao carregar pedidos:", error);
        setError(
          "Não foi possível carregar os pedidos. Verifique sua conexão."
        );
        toast({
          title: "Erro ao carregar pedidos",
          description:
            "Não foi possível carregar os pedidos. Verifique sua conexão.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    }

    carregarTodosPedidos();

    // Atualizar a cada minuto para manter os dados recentes
    const intervalId = setInterval(carregarTodosPedidos, 60000);
    return () => clearInterval(intervalId);
  }, [toast]);

  // Aplicar filtros quando os critérios mudarem - mantido sem alteração
  useEffect(() => {
    let result = [...pedidos];

    // Filtrar por status
    if (statusFilter !== "todos") {
      result = result.filter((pedido) => pedido.status === statusFilter);
    }

    // Filtrar por data
    if (dateFilter !== "todos") {
      const now = Date.now();
      const oneDayMs = 24 * 60 * 60 * 1000;

      switch (dateFilter) {
        case "hoje":
          result = result.filter((pedido) => {
            const pedidoDate = new Date(pedido.timestamp);
            const today = new Date();
            return pedidoDate.toDateString() === today.toDateString();
          });
          break;
        case "ontem":
          result = result.filter((pedido) => {
            const pedidoDate = new Date(pedido.timestamp);
            const yesterday = new Date(now - oneDayMs);
            return pedidoDate.toDateString() === yesterday.toDateString();
          });
          break;
        case "semana":
          result = result.filter(
            (pedido) => pedido.timestamp > now - 7 * oneDayMs
          );
          break;
        case "mes":
          result = result.filter(
            (pedido) => pedido.timestamp > now - 30 * oneDayMs
          );
          break;
      }
    }

    // Filtrar por busca (ID do pedido ou mesa)
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (pedido) =>
          pedido.id.toLowerCase().includes(query) ||
          (pedido.mesa && pedido.mesa.toLowerCase().includes(query))
      );
    }

    setFilteredPedidos(result);
  }, [pedidos, statusFilter, dateFilter, searchQuery]);

  // Nova função para atualizar status de pedidos
  const handleUpdateStatus = async (
    pedidoId: string,
    novoStatus: string
  ) => {
    try {
      // Encontrar o pedido correspondente para obter a mesa
      const pedido = pedidos.find(p => p.id === pedidoId);
      if (!pedido) {
        throw new Error("Pedido não encontrado");
      }

      const success = await atualizarStatusPedido(
        pedidoId,
        novoStatus as "confirmado" | "preparando" | "entregue",
        pedido.mesa,
        "Status atualizado pelo cliente"
      );

      if (success) {
        // Atualizar localmente
        setPedidos(
          pedidos.map((p) =>
            p.id === pedidoId ? { ...p, status: novoStatus as any } : p
          )
        );

        toast({
          title: "Status atualizado",
          description: `Pedido #${pedidoId.slice(-4)} atualizado para ${novoStatus}`,
        });
      } else {
        throw new Error("Falha ao atualizar status");
      }
    } catch (error) {
      console.error("Erro ao atualizar status:", error);
      toast({
        title: "Erro ao atualizar status",
        description: "Não foi possível atualizar o status do pedido",
        variant: "destructive",
      });
    }
  };

  const formatarData = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusBadge = (status: Pedido["status"]) => {
    switch (status) {
      case "confirmado":
        return <Badge className="bg-blue-500">Confirmado</Badge>;
      case "preparando":
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
      case "preparando":
        return <Utensils className="h-5 w-5 text-orange-500" />;
      case "entregue":
        return <ShoppingBag className="h-5 w-5 text-green-500" />;
      default:
        return null;
    }
  };

  const calcularTotalPedido = (pedido: Pedido) => {
    return pedido.itens.reduce(
      (total, item) => total + item.preco * item.quantidade,
      0
    );
  };

  const limparFiltros = () => {
    setStatusFilter("todos");
    setDateFilter("todos");
    setSearchQuery("");
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background border-b">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/">
                <ArrowLeft className="h-5 w-5" />
                <span className="sr-only">Voltar</span>
              </Link>
            </Button>
            <h1 className="font-bold text-lg">Todos os Pedidos</h1>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Barra de pesquisa e filtros */}
      <div className="sticky top-[57px] z-10 bg-background border-b">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Buscar por ID ou mesa..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1 h-7 w-7"
                  onClick={() => setSearchQuery("")}
                >
                  <X className="h-4 w-4" />
                  <span className="sr-only">Limpar</span>
                </Button>
              )}
            </div>

            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon">
                  <SlidersHorizontal className="h-4 w-4" />
                  <span className="sr-only">Filtros</span>
                </Button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle>Filtros</SheetTitle>
                  <SheetDescription>
                    Refine sua busca de pedidos
                  </SheetDescription>
                </SheetHeader>

                <div className="py-6 space-y-6">
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium">Status</h3>
                    <Select
                      value={statusFilter}
                      onValueChange={setStatusFilter}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos">Todos os status</SelectItem>
                        <SelectItem value="confirmado">Confirmado</SelectItem>
                        <SelectItem value="preparando">Em preparo</SelectItem>
                        <SelectItem value="entregue">Entregue</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-sm font-medium">Período</h3>
                    <Select value={dateFilter} onValueChange={setDateFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um período" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos">Todos os períodos</SelectItem>
                        <SelectItem value="hoje">Hoje</SelectItem>
                        <SelectItem value="ontem">Ontem</SelectItem>
                        <SelectItem value="semana">Últimos 7 dias</SelectItem>
                        <SelectItem value="mes">Últimos 30 dias</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <SheetFooter>
                  <SheetClose asChild>
                    <Button variant="outline" onClick={limparFiltros}>
                      Limpar filtros
                    </Button>
                  </SheetClose>
                  <SheetClose asChild>
                    <Button>Aplicar filtros</Button>
                  </SheetClose>
                </SheetFooter>
              </SheetContent>
            </Sheet>
          </div>

          {/* Tabs de status para filtro rápido */}
          <div className="mt-3">
            <Tabs
              defaultValue="todos"
              value={statusFilter}
              onValueChange={setStatusFilter}
            >
              <TabsList className="w-full overflow-x-auto flex justify-start p-1 h-auto">
                <TabsTrigger value="todos" className="px-3 py-1.5">
                  Todos
                </TabsTrigger>
                <TabsTrigger value="confirmado" className="px-3 py-1.5">
                  Confirmados
                </TabsTrigger>
                <TabsTrigger value="preparando" className="px-3 py-1.5">
                  Em preparo
                </TabsTrigger>
                <TabsTrigger value="entregue" className="px-3 py-1.5">
                  Entregues
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>
      </div>

      {/* Conteúdo principal */}
      <main className="flex-1 container mx-auto px-4 py-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p>Carregando pedidos...</p>
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
        ) : filteredPedidos.length > 0 ? (
          <div className="space-y-6">
            {filteredPedidos.map((pedido) => (
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

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground mb-4">
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 mr-1" />
                      {formatarData(pedido.timestamp)}
                    </div>
                    {pedido.mesa && (
                      <div className="flex items-center">
                        <span className="font-medium">Mesa: {pedido.mesa}</span>
                      </div>
                    )}
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
                      {calcularTotalPedido(pedido).toFixed(2).replace(".", ",")}
                    </span>
                  </div>

                  {/* Nova seção para atualizar status */}
                  <div className="border-t mt-3 pt-3">
                    <div className="flex gap-2 flex-wrap">
                      <Button
                        size="sm"
                        variant={
                          pedido.status === "confirmado" ? "default" : "outline"
                        }
                        onClick={() =>
                          handleUpdateStatus(pedido.id, "confirmado")
                        }
                        disabled={pedido.status === "entregue"}
                      >
                        Confirmado
                      </Button>
                      <Button
                        size="sm"
                        variant={
                          pedido.status === "preparando" ? "default" : "outline"
                        }
                        onClick={() =>
                          handleUpdateStatus(pedido.id, "preparando")
                        }
                        disabled={pedido.status === "entregue"}
                      >
                        Preparando
                      </Button>
                      <Button
                        size="sm"
                        variant={
                          pedido.status === "entregue" ? "default" : "outline"
                        }
                        onClick={() =>
                          handleUpdateStatus(pedido.id, "entregue")
                        }
                      >
                        Entregue
                      </Button>
                    </div>
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
            <h2 className="text-xl font-bold mb-2">Nenhum pedido encontrado</h2>
            <p className="text-muted-foreground mb-6">
              {searchQuery || statusFilter !== "todos" || dateFilter !== "todos"
                ? "Tente ajustar os filtros para ver mais resultados"
                : "Não há pedidos registrados no sistema"}
            </p>
            {(searchQuery ||
              statusFilter !== "todos" ||
              dateFilter !== "todos") && (
              <Button onClick={limparFiltros}>Limpar filtros</Button>
            )}
          </div>
        )}
      </main>

      <Toaster />
    </div>
  );
}
