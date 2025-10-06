"use client";

import { AuthGuard } from "@/src/components/auth/AuthGuard";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/src/components/ui/table";
import { Badge } from "@/src/components/ui/badge";
import { Toaster } from "@/src/components/ui/toaster";
import { useToast } from "@/src/components/ui/use-toast";
import { buscarHistoricoChamados, atenderChamado } from "@/src/services/chamados";
import type { Chamado } from "@/src/types";
import { formatarDataHora } from "@/src/utils/formatters";
import {
  AlertCircle,
  Check,
  Hand,
  Loader2,
  RefreshCw,
  Search,
  X,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

export default function ChamadosPage() {
  const { toast } = useToast();

  const [chamados, setChamados] = useState<Chamado[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtroStatus, setFiltroStatus] = useState<string>("todos");
  const [filtroBusca, setFiltroBusca] = useState<string>("");
  const [processando, setProcessando] = useState<number | null>(null);

  const fetchChamados = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const chamadosData = await buscarHistoricoChamados();
      setChamados(chamadosData);
    } catch (error) {
      console.error("Erro ao carregar chamados:", error);
      setError("Falha ao carregar chamados. Verifique sua conexão.");
      toast({
        title: "Erro",
        description: "Não foi possível carregar os chamados.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchChamados();

    // Atualização periódica
    const intervalId = setInterval(fetchChamados, 30000);
    return () => clearInterval(intervalId);
  }, [fetchChamados]);

  const handleAtender = async (chamadoId: number) => {
    try {
      setProcessando(chamadoId);
      await atenderChamado(chamadoId);

      // Atualizar localmente
      setChamados((prev) =>
        prev.map((c) =>
          c.id === chamadoId ? { ...c, status: "atendido" } : c
        )
      );

      toast({
        title: "Chamado atendido",
        description: "O chamado foi marcado como atendido.",
      });
    } catch (error) {
      toast({
        title: "Erro ao atender chamado",
        description: "Tente novamente em alguns instantes.",
        variant: "destructive",
      });
    } finally {
      setProcessando(null);
    }
  };

  const chamadosFiltrados = chamados
    .filter((chamado) => {
      // Filtro de status
      if (filtroStatus !== "todos" && chamado.status !== filtroStatus) {
        return false;
      }

      // Filtro de busca
      if (filtroBusca) {
        const termoBusca = filtroBusca.toLowerCase();
        const mesaMatch =
          chamado.mesaNome?.toLowerCase().includes(termoBusca) ||
          chamado.mesaUuid.toLowerCase().includes(termoBusca);
        return mesaMatch;
      }

      return true;
    })
    .sort((a, b) => {
      // Ordenar por data (mais recente primeiro)
      return new Date(b.criadoEm).getTime() - new Date(a.criadoEm).getTime();
    });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      pendente: "default",
      atendido: "secondary",
      cancelado: "destructive",
    };

    const labels: Record<string, string> = {
      pendente: "Pendente",
      atendido: "Atendido",
      cancelado: "Cancelado",
    };

    return (
      <Badge variant={variants[status] || "default"}>
        {labels[status] || status}
      </Badge>
    );
  };

  return (
    <AuthGuard>
      <div className="container mx-auto py-8 px-4">
        <div className="flex flex-row items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Histórico de Chamados
            </h1>
            <p className="text-muted-foreground">
              Visualize e gerencie os chamados de garçom
            </p>
          </div>
          <Button variant="outline" onClick={fetchChamados} disabled={loading}>
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
                placeholder="Buscar por mesa"
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
                <SelectItem value="pendente">Pendente</SelectItem>
                <SelectItem value="atendido">Atendido</SelectItem>
                <SelectItem value="cancelado">Cancelado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Tabela */}
        {loading && !chamados.length ? (
          <div className="flex justify-center items-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary mr-2" />
            <span>Carregando chamados...</span>
          </div>
        ) : error ? (
          <Card className="border-destructive">
            <CardContent className="pt-6 text-center">
              <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                Erro ao carregar chamados
              </h3>
              <p className="text-muted-foreground mb-4">{error}</p>
              <Button onClick={fetchChamados}>Tentar novamente</Button>
            </CardContent>
          </Card>
        ) : chamadosFiltrados.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center">
              <Hand className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                Nenhum chamado encontrado
              </h3>
              <p className="text-muted-foreground">
                {filtroBusca || filtroStatus !== "todos"
                  ? "Tente ajustar os filtros para ver mais resultados."
                  : "Não há chamados registrados no momento."}
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mesa</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Criado em</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {chamadosFiltrados.map((chamado) => (
                    <TableRow key={chamado.id}>
                      <TableCell className="font-medium">
                        {chamado.mesaNome || chamado.mesaUuid}
                      </TableCell>
                      <TableCell>{getStatusBadge(chamado.status)}</TableCell>
                      <TableCell>{formatarDataHora(chamado.criadoEm)}</TableCell>
                      <TableCell className="text-right">
                        {chamado.status === "pendente" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleAtender(chamado.id)}
                            disabled={processando === chamado.id}
                          >
                            {processando === chamado.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <Check className="h-4 w-4 mr-1" />
                                Atender
                              </>
                            )}
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        <Toaster />
      </div>
    </AuthGuard>
  );
}
