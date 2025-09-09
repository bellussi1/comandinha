"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/src/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/src/components/ui/card";
import { useToast } from "@/src/components/ui/use-toast";
import { MesaCard } from "./MesaCard";
import { getMesasAtivas } from "@/src/services/fechamento";
import { formatarMoeda } from "@/src/utils/formatters";
import { Search, RefreshCw, DollarSign, Clock, Receipt } from "lucide-react";
import type { MesaFechamento, FiltrosFechamento } from "@/src/types";

export function MesasDashboard() {
  const [mesas, setMesas] = useState<MesaFechamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtros, setFiltros] = useState<FiltrosFechamento>({
    status: 'todas',
    busca: ''
  });
  const { toast } = useToast();

  const carregarMesas = useCallback(async () => {
    try {
      setLoading(true);
      const mesasAtivas = await getMesasAtivas();
      setMesas(mesasAtivas);
    } catch (error) {
      console.error('Erro ao carregar mesas:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as mesas ativas.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    carregarMesas();
  }, [carregarMesas]);

  // Filtrar mesas
  const mesasFiltradas = mesas.filter((mesa) => {
    // Filtro por status
    if (filtros.status !== 'todas' && mesa.status !== filtros.status) {
      return false;
    }

    // Filtro por busca
    if (filtros.busca && !mesa.nome.toLowerCase().includes(filtros.busca.toLowerCase())) {
      return false;
    }

    return true;
  });

  // Estatísticas gerais
  const totalMesas = mesasFiltradas.length;
  const valorTotalGeral = mesasFiltradas.reduce((total, mesa) => total + mesa.valorTotal, 0);
  const totalPedidos = mesasFiltradas.reduce((total, mesa) => total + mesa.totalPedidos, 0);
  const mesasComPendencias = mesasFiltradas.filter(mesa => mesa.pedidosAtivos > 0).length;

  return (
    <div className="space-y-6">
      {/* Header com estatísticas */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Mesas Ativas</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalMesas}</div>
            {mesasComPendencias > 0 && (
              <p className="text-xs text-orange-600">
                {mesasComPendencias} com pedidos pendentes
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {formatarMoeda(valorTotalGeral)}
            </div>
            <p className="text-xs text-muted-foreground">
              De todas as mesas ativas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Pedidos</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalPedidos}</div>
            <p className="text-xs text-muted-foreground">
              Pedidos em andamento
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ticket Médio</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalMesas > 0 ? formatarMoeda(valorTotalGeral / totalMesas) : formatarMoeda(0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Valor médio por mesa
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros e ações */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle>Mesas para Fechamento</CardTitle>
              <CardDescription>
                Gerencie o fechamento de contas das mesas ocupadas
              </CardDescription>
            </div>
            <Button onClick={carregarMesas} disabled={loading} variant="outline">
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Controles de filtro */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Buscar por nome da mesa..."
                value={filtros.busca}
                onChange={(e) => setFiltros({ ...filtros, busca: e.target.value })}
                className="pl-10"
              />
            </div>
            
            <Select 
              value={filtros.status} 
              onValueChange={(value) => setFiltros({ ...filtros, status: value as any })}
            >
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Filtrar por status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas as Mesas</SelectItem>
                <SelectItem value="em uso">Em Uso</SelectItem>
                <SelectItem value="livre">Livres</SelectItem>
                <SelectItem value="expirada">Expiradas</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Lista de mesas */}
          {loading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardHeader className="space-y-2">
                    <div className="h-4 bg-muted rounded w-3/4" />
                    <div className="h-3 bg-muted rounded w-1/2" />
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="h-3 bg-muted rounded" />
                    <div className="h-3 bg-muted rounded w-2/3" />
                    <div className="h-8 bg-muted rounded w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : mesasFiltradas.length === 0 ? (
            <div className="text-center py-12">
              <Receipt className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhuma mesa encontrada</h3>
              <p className="text-muted-foreground mb-4">
                {mesas.length === 0 
                  ? "Não há mesas ativas no momento."
                  : "Nenhuma mesa corresponde aos filtros aplicados."}
              </p>
              <Button variant="outline" onClick={carregarMesas}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Atualizar Lista
              </Button>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {mesasFiltradas.map((mesa) => (
                <MesaCard key={mesa.id} mesa={mesa} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}