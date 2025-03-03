import type { Mesa } from "../types";

const MESAS_MOCK: Mesa[] = Array.from({ length: 12 }, (_, i) => ({
  numero: (i + 1).toString(),
  status: "ocupada",
  pedidosEmAberto: Math.floor(Math.random() * 3),
  ultimaAtualizacao: Date.now() - Math.floor(Math.random() * 3600000),
}));

export const getMesas = () => {
  return MESAS_MOCK;
};

export const getMesaByNumero = (numero: string) => {
  return MESAS_MOCK.find((mesa) => mesa.numero === numero);
};

export const atualizarStatusMesa = (numero: string, status: Mesa["status"]) => {
  const mesa = MESAS_MOCK.find((m) => m.numero === numero);
  if (mesa) {
    mesa.status = status;
    mesa.ultimaAtualizacao = Date.now();
    return true;
  }
  return false;
};
