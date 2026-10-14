// src/utils/calculadores.ts
import { ItemCarrinho, Pedido, ItemDivisao } from "@/src/types";

/**
 * Calcula o valor total de um array de itens
 */
export const calcularTotalItems = (items: ItemCarrinho[]): number => {
  return items.reduce((total, item) => total + item.preco * item.quantidade, 0);
};

/**
 * Calcula o valor total de um pedido
 */
export const calcularTotalPedido = (pedido: Pedido): number => {
  return pedido.itens.reduce(
    (total, item) => total + item.preco * item.quantidade,
    0
  );
};

/**
 * Verifica se existem itens sem pessoa atribuída
 */
export const verificarItensSemDivisao = (
  itensDivisao: ItemDivisao[]
): boolean => {
  return itensDivisao.some((item) => item.pessoas.length === 0);
};

/**
 * Calcula totais por pessoa em uma divisão de conta
 */
export const calcularDivisaoConta = (
  itensDivisao: ItemDivisao[],
  numPessoas: number,
  taxaServicoPct: number = 0.1
) => {
  // Inicializar array de totais com zeros
  const totaisPorPessoa = Array(numPessoas).fill(0);

  // Calcular quanto cada pessoa paga por cada item
  itensDivisao.forEach((item) => {
    const valorTotalItem = item.preco * item.quantidade;
    const pessoasPagantes = item.pessoas.length;

    if (pessoasPagantes > 0) {
      const valorPorPessoa = valorTotalItem / pessoasPagantes;
      item.pessoas.forEach((pessoaIndex) => {
        if (pessoaIndex < totaisPorPessoa.length) {
          totaisPorPessoa[pessoaIndex] += valorPorPessoa;
        }
      });
    }
  });

  // Calcular total da conta
  const totalConta = totaisPorPessoa.reduce((acc, val) => acc + val, 0);

  // Taxa de serviço
  const taxaServico = totalConta * taxaServicoPct;

  // Taxa por pessoa (dividida igualmente)
  const taxaServicoIndividual = taxaServico / numPessoas;

  return {
    totaisPorPessoa,
    totalConta,
    taxaServico,
    taxaServicoIndividual,
  };
};
