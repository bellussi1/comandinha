"use client";

import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/src/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/src/components/ui/alert-dialog";
import { Separator } from "@/src/components/ui/separator";
import { useToast } from "@/src/components/ui/use-toast";
import { fecharContaMesa, gerarResumoFinanceiro } from "@/src/services/fechamento";
import { formatarMoeda } from "@/src/utils/formatters";
import { Clock, Receipt, Users, AlertTriangle, CheckCircle, Loader2, FileText } from "lucide-react";
import { useState, useEffect } from "react";
import type { MesaFechamento, StatusMesa, ResumoFinanceiroMesa } from "@/src/types";

interface MesaCardProps {
  mesa: MesaFechamento;
  onMesaFechada?: () => void;
}

const getStatusConfig = (status: StatusMesa) => {
  const configs: Record<StatusMesa, {
    label: string;
    variant: "default" | "destructive" | "secondary" | "outline";
    color: string;
    icon: any;
  }> = {
    "em uso": {
      label: "Em Uso",
      variant: "default" as const,
      color: "bg-blue-500",
      icon: Users
    },
    livre: {
      label: "Livre",
      variant: "secondary" as const,
      color: "bg-gray-500",
      icon: Users
    },
    expirada: {
      label: "Expirada",
      variant: "destructive" as const,
      color: "bg-red-500",
      icon: AlertTriangle
    }
  };

  return configs[status] || configs["em uso"];
};

const formatarTempo = (minutos: number): string => {
  if (minutos < 60) {
    return `${minutos}min`;
  }

  const horas = Math.floor(minutos / 60);
  const mins = minutos % 60;

  if (mins === 0) {
    return `${horas}h`;
  }

  return `${horas}h ${mins}min`;
};

export function MesaCard({ mesa, onMesaFechada }: MesaCardProps) {
  const statusConfig = getStatusConfig(mesa.status);
  const StatusIcon = statusConfig.icon;
  const { toast } = useToast();
  const [fechandoMesa, setFechandoMesa] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [resumo, setResumo] = useState<ResumoFinanceiroMesa | null>(null);
  const [loadingResumo, setLoadingResumo] = useState(false);

  const carregarResumo = async () => {
    try {
      setLoadingResumo(true);
      const dadosResumo = await gerarResumoFinanceiro(mesa.id);
      setResumo(dadosResumo);
    } catch (error) {
      console.error("Erro ao carregar resumo:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os detalhes da mesa.",
        variant: "destructive",
      });
    } finally {
      setLoadingResumo(false);
    }
  };

  useEffect(() => {
    if (dialogOpen && !resumo) {
      carregarResumo();
    }
  }, [dialogOpen, resumo]);

  const handleFecharMesa = async () => {
    try {
      setFechandoMesa(true);

      await fecharContaMesa(mesa.id, {
        metodo_pagamento: 'dinheiro'
      });

      toast({
        title: "Mesa fechada com sucesso!",
        description: `A conta da ${mesa.nome} foi fechada. Valor total: ${formatarMoeda(mesa.valorTotal)}`,
      });

      // Callback para atualizar a lista
      onMesaFechada?.();

    } catch (error) {
      console.error("Erro ao fechar mesa:", error);
      const errorMessage = (error as Error).message || "Não foi possível fechar a conta da mesa. Tente novamente.";
      toast({
        title: "Erro ao fechar mesa",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setFechandoMesa(false);
    }
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <div
              className={`w-3 h-3 rounded-full ${statusConfig.color}`}
              aria-label={`Status: ${statusConfig.label}`}
            />
            {mesa.nome}
          </CardTitle>
          <Badge variant={statusConfig.variant} className="flex items-center gap-1">
            <StatusIcon className="h-3 w-3" />
            {statusConfig.label}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Informações principais */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Receipt className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Pedidos:</span>
            <span className="font-medium">{mesa.totalPedidos}</span>
          </div>

          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Tempo:</span>
            <span className="font-medium">
              {mesa.tempoOcupacao ? formatarTempo(mesa.tempoOcupacao) : '-'}
            </span>
          </div>
        </div>

        {/* Alertas */}
        {mesa.pedidosAtivos > 0 && (
          <div className="flex items-center gap-2 p-2 bg-orange-50 rounded-lg text-orange-800 text-sm">
            <AlertTriangle className="h-4 w-4" />
            <span>{mesa.pedidosAtivos} pedido(s) em preparo</span>
          </div>
        )}

        {/* Valor total */}
        <div className="border-t pt-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Total da Mesa:</span>
            <span className="text-lg font-bold text-primary">
              {formatarMoeda(mesa.valorTotal)}
            </span>
          </div>
        </div>

        {/* Botões de ação */}
        <div className="flex gap-2 pt-2">
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
              >
                <Receipt className="h-4 w-4 mr-2" />
                Ver Detalhes
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Detalhes da Conta - {mesa.nome}
                </DialogTitle>
                <DialogDescription>
                  Resumo completo dos pedidos e valores
                </DialogDescription>
              </DialogHeader>

              {loadingResumo ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : resumo ? (
                <div className="space-y-6">
                  {/* Cabeçalho estilo nota fiscal */}
                  <div className="text-center border-b pb-4">
                    <h3 className="font-bold text-lg">RESUMO DA CONTA</h3>
                    <p className="text-sm text-muted-foreground">{mesa.nome}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date().toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>

                  {/* Detalhes de cada pedido */}
                  <div className="space-y-3">
                    <h4 className="font-semibold text-sm uppercase text-muted-foreground">
                      Pedidos ({resumo.pedidos.length})
                    </h4>
                    {resumo.pedidos.map((pedido, pedidoIndex) => (
                      <div key={`pedido-${pedido.pedidoId}-${pedidoIndex}`} className="border rounded-lg p-3 space-y-2">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm">Pedido #{pedido.pedidoId}</span>
                              </div>
                          <span className="text-xs text-muted-foreground">
                            {new Date(pedido.timestamp).toLocaleString('pt-BR', {
                              day: '2-digit',
                              month: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>

                        {/* Produtos do pedido */}
                        <div className="pl-3 space-y-1 border-l-2 border-muted">
                          {pedido.itens.map((item, itemIndex) => (
                            <div key={`pedido-${pedido.pedidoId}-item-${itemIndex}`} className="flex justify-between items-start text-sm">
                              <div className="flex-1">
                                <span className="text-muted-foreground">{item.quantidade}x</span>
                                <span className="ml-1">{item.nome}</span>
                                {item.observacoes && (
                                  <p className="text-xs text-orange-600 ml-5">
                                    Obs: {item.observacoes}
                                  </p>
                                )}
                              </div>
                              <div className="text-right ml-2">
                                <div className="font-medium">{formatarMoeda(item.subtotal)}</div>
                                <div className="text-xs text-muted-foreground">
                                  {formatarMoeda(item.precoUnitario)} un.
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>

                        {pedido.observacoesGerais && (
                          <div className="text-xs bg-orange-50 text-orange-800 p-2 rounded">
                            <span className="font-medium">Obs. Geral:</span> {pedido.observacoesGerais}
                          </div>
                        )}

                        <div className="flex justify-between items-center pt-2 border-t">
                          <span className="text-sm font-medium">Total do Pedido:</span>
                          <span className="font-bold">{formatarMoeda(pedido.valorTotal)}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <Separator />

                  {/* Totais */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Subtotal:</span>
                      <span className="font-medium">{formatarMoeda(resumo.subtotal)}</span>
                    </div>

                    {resumo.desconto > 0 && (
                      <div className="flex justify-between text-sm text-green-600">
                        <span>Desconto:</span>
                        <span>-{formatarMoeda(resumo.desconto)}</span>
                      </div>
                    )}

                    {resumo.taxaServico > 0 && (
                      <div className="flex justify-between text-sm">
                        <span>Taxa de Serviço:</span>
                        <span>+{formatarMoeda(resumo.taxaServico)}</span>
                      </div>
                    )}

                    <Separator />

                    <div className="flex justify-between items-center pt-2">
                      <span className="text-lg font-bold">TOTAL:</span>
                      <span className="text-2xl font-bold text-primary">
                        {formatarMoeda(resumo.totalFinal)}
                      </span>
                    </div>
                  </div>

                  {/* Informações adicionais */}
                  <div className="text-center text-xs text-muted-foreground border-t pt-4">
                    <p>Total de itens únicos: {resumo.itensConsolidados.length}</p>
                    <p>Total de pedidos: {resumo.pedidos.length}</p>
                    {mesa.pedidosAtivos > 0 && (
                      <p className="text-orange-600 font-medium mt-2">
                        ⚠️ {mesa.pedidosAtivos} pedido(s) ainda em preparo
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Erro ao carregar detalhes
                </div>
              )}
            </DialogContent>
          </Dialog>

          {mesa.valorTotal > 0 && mesa.pedidosAtivos === 0 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  size="sm"
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  disabled={fechandoMesa}
                >
                  {fechandoMesa ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <CheckCircle className="h-4 w-4 mr-2" />
                  )}
                  Fechar Conta
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Confirmar Fechamento</AlertDialogTitle>
                  <AlertDialogDescription asChild>
                    <div className="space-y-4">
                      <p>
                        Tem certeza de que deseja fechar a conta da <strong>{mesa.nome}</strong>?
                      </p>
                      <div className="bg-muted p-3 rounded-lg">
                        <div className="flex justify-between items-center">
                          <span>Valor Total:</span>
                          <span className="font-bold text-lg text-primary">
                            {formatarMoeda(mesa.valorTotal)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center mt-1">
                          <span>Total de Pedidos:</span>
                          <span className="font-medium">{mesa.totalPedidos}</span>
                        </div>
                      </div>
                      <p>
                        Esta ação não pode ser desfeita e a mesa será liberada para nova ocupação.
                      </p>
                    </div>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleFecharMesa}
                    className="bg-green-600 hover:bg-green-700"
                    disabled={fechandoMesa}
                  >
                    {fechandoMesa ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Fechando...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Confirmar Fechamento
                      </>
                    )}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </CardContent>
    </Card>
  );
}