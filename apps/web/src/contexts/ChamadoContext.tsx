"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import type { Chamado } from "@/src/types";
import {
  criarChamado as criarChamadoAPI,
  cancelarChamado as cancelarChamadoAPI,
} from "@/src/services/chamados";

interface ChamadoContextData {
  chamadoAtivo: Chamado | null;
  criandoChamado: boolean;
  cancelandoChamado: boolean;
  criarChamado: (mesaUuid: string) => Promise<void>;
  cancelarChamado: (chamadoId: number, mesaUuid: string) => Promise<void>;
  limparChamado: () => void;
}

const ChamadoContext = createContext<ChamadoContextData | undefined>(undefined);

export function ChamadoProvider({ children }: { children: React.ReactNode }) {
  const [chamadoAtivo, setChamadoAtivo] = useState<Chamado | null>(null);
  const [criandoChamado, setCriandoChamado] = useState(false);
  const [cancelandoChamado, setCancelandoChamado] = useState(false);

  const criarChamado = useCallback(async (mesaUuid: string) => {
    setCriandoChamado(true);
    try {
      const novoChamado = await criarChamadoAPI(mesaUuid);
      setChamadoAtivo(novoChamado);
    } finally {
      setCriandoChamado(false);
    }
  }, []);

  const cancelarChamado = useCallback(
    async (chamadoId: number, mesaUuid: string) => {
      setCancelandoChamado(true);
      try {
        await cancelarChamadoAPI(chamadoId, mesaUuid);
        setChamadoAtivo(null);
      } finally {
        setCancelandoChamado(false);
      }
    },
    []
  );

  const limparChamado = useCallback(() => {
    setChamadoAtivo(null);
  }, []);

  return (
    <ChamadoContext.Provider
      value={{
        chamadoAtivo,
        criandoChamado,
        cancelandoChamado,
        criarChamado,
        cancelarChamado,
        limparChamado,
      }}
    >
      {children}
    </ChamadoContext.Provider>
  );
}

export function useChamado() {
  const context = useContext(ChamadoContext);
  if (context === undefined) {
    throw new Error("useChamado deve ser usado dentro de um ChamadoProvider");
  }
  return context;
}
