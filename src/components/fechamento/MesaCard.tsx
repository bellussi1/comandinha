"use client";

import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card";
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
import { useToast } from "@/src/components/ui/use-toast";
import { fecharContaMesa } from "@/src/services/fechamento";
import { formatarMoeda } from "@/src/utils/formatters";
import { Clock, Receipt, Users, AlertTriangle, CheckCircle, Loader2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import type { MesaFechamento, StatusMesa } from "@/src/types";

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
          <Button 
            asChild 
            variant="outline" 
            size="sm" 
            className="flex-1"
          >
            <Link href={`/admin/fechamento/mesa/${mesa.id}`}>
              <Receipt className="h-4 w-4 mr-2" />
              Ver Detalhes
            </Link>
          </Button>
          
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