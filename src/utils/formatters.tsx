// src/utils/formatters.ts
import { Badge } from "@/src/components/ui/badge";
import { CheckCircle, Coffee, Send, Clock } from "lucide-react";

/**
 * Formata uma data ISO para exibição amigável (data e hora)
 */
export const formatarDataHora = (dataISO: string): string => {
  return new Date(dataISO).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

/**
 * Formata uma data ISO para exibição completa (dia, mês, ano, hora)
 */
export const formatarDataCompleta = (dataISO: string): string => {
  return new Date(dataISO).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

/**
 * Formata apenas a hora de uma data ISO
 */
export const formatarHora = (dataISO: string): string => {
  return new Date(dataISO).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

/**
 * Retorna um componente Badge estilizado para cada status
 */
export const getStatusBadge = (status: string) => {
  switch (status.toLowerCase()) {
    case "confirmado":
      return <Badge className="bg-blue-500">Confirmado</Badge>;
    case "preparando":
      return <Badge className="bg-orange-500">Em preparo</Badge>;
    case "pronto":
      return <Badge className="bg-green-500">Pronto</Badge>;
    case "entregue":
      return <Badge className="bg-slate-500">Entregue</Badge>;
    default:
      return <Badge>{status}</Badge>;
  }
};

/**
 * Retorna um ícone para cada status
 */
export const getStatusIcon = (status: string) => {
  switch (status.toLowerCase()) {
    case "confirmado":
      return <CheckCircle className="h-5 w-5 text-blue-500" />;
    case "preparando":
      return <Coffee className="h-5 w-5 text-orange-500" />;
    case "pronto":
      return <Send className="h-5 w-5 text-green-500" />;
    case "entregue":
      return <Clock className="h-5 w-5 text-slate-500" />;
    default:
      return <CheckCircle className="h-5 w-5" />;
  }
};
