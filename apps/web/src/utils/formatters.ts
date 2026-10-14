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
 * Formata um valor monetário com prefixo R$
 */
export const formatarMoeda = (valor: number): string => {
  return `R$ ${valor.toFixed(2).replace(".", ",")}`;
};

/**
 * Formata uma data para exibição relativa (hoje, ontem, etc)
 */
export const formatarDataRelativa = (dataISO: string): string => {
  const data = new Date(dataISO);
  const hoje = new Date();
  const ontem = new Date(hoje);
  ontem.setDate(ontem.getDate() - 1);
  
  if (data.toDateString() === hoje.toDateString()) {
    return `Hoje, ${formatarHora(dataISO)}`;
  } else if (data.toDateString() === ontem.toDateString()) {
    return `Ontem, ${formatarHora(dataISO)}`;
  } else {
    return formatarDataHora(dataISO);
  }
}; 