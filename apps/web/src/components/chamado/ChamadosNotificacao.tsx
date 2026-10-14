"use client";

import { useEffect, useState } from "react";
import { Button } from "@/src/components/ui/button";
import { Card } from "@/src/components/ui/card";
import { X, Check } from "lucide-react";
import type { Chamado } from "@/src/types";
import { atenderChamado, listarChamadosPendentes } from "@/src/services/chamados";
import { useToast } from "@/src/components/ui/use-toast";

export function ChamadosNotificacao() {
  const [chamados, setChamados] = useState<Chamado[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    // Buscar chamados pendentes ao montar
    const fetchChamados = async () => {
      try {
        const chamadosPendentes = await listarChamadosPendentes();
        setChamados(chamadosPendentes);
      } catch (error) {
        console.error("Erro ao buscar chamados pendentes:", error);
      }
    };

    fetchChamados();

    // Poll a cada 10 segundos para novos chamados
    const interval = setInterval(fetchChamados, 10000);

    return () => clearInterval(interval);
  }, []);

  const handleAtender = async (chamado: Chamado) => {
    try {
      await atenderChamado(chamado.id);
      setChamados((prev) => prev.filter((c) => c.id !== chamado.id));
      toast({
        title: "Chamado atendido",
        description: `Mesa ${chamado.mesaNome || chamado.mesaUuid} foi atendida.`,
      });
    } catch (error) {
      toast({
        title: "Erro ao atender chamado",
        description: "Tente novamente em alguns instantes.",
        variant: "destructive",
      });
    }
  };

  const handleDismiss = (chamadoId: number) => {
    setChamados((prev) => prev.filter((c) => c.id !== chamadoId));
  };

  if (chamados.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
      {chamados.map((chamado) => (
        <Card
          key={chamado.id}
          className="p-4 shadow-lg border-l-4 border-l-primary animate-in slide-in-from-right"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <h4 className="font-semibold text-sm">
                Mesa {chamado.mesaNome || chamado.id}
              </h4>
              <p className="text-xs text-muted-foreground mt-1">
                Está chamando o garçom
              </p>
            </div>
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6"
              onClick={() => handleDismiss(chamado.id)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="mt-3 flex gap-2">
            <Button
              size="sm"
              className="flex-1"
              onClick={() => handleAtender(chamado)}
            >
              <Check className="h-4 w-4 mr-1" />
              Atendido
            </Button>
          </div>
        </Card>
      ))}
    </div>
  );
}
