"use client";

import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card";
import { formatarMoeda } from "@/src/utils/formatters";
import { Clock, Receipt, Users, AlertTriangle } from "lucide-react";
import Link from "next/link";
import type { MesaFechamento, StatusMesa } from "@/src/types";

interface MesaCardProps {
  mesa: MesaFechamento;
}

const getStatusConfig = (status: StatusMesa) => {
  const configs = {
    ocupada: {
      label: "Ocupada",
      variant: "default" as const,
      color: "bg-blue-500",
      icon: Users
    },
    fechando: {
      label: "Fechando",
      variant: "destructive" as const,
      color: "bg-orange-500",
      icon: AlertTriangle
    },
    livre: {
      label: "Livre",
      variant: "secondary" as const,
      color: "bg-gray-500",
      icon: Users
    },
    reservada: {
      label: "Reservada",
      variant: "outline" as const,
      color: "bg-purple-500",
      icon: Users
    },
    manutencao: {
      label: "Manutenção",
      variant: "outline" as const,
      color: "bg-red-500",
      icon: AlertTriangle
    }
  };
  
  return configs[status] || configs.ocupada;
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

export function MesaCard({ mesa }: MesaCardProps) {
  const statusConfig = getStatusConfig(mesa.status);
  const StatusIcon = statusConfig.icon;
  
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
            <Button 
              asChild 
              size="sm" 
              className="flex-1"
            >
              <Link href={`/admin/fechamento/mesa/${mesa.id}?action=fechar`}>
                Fechar Conta
              </Link>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}