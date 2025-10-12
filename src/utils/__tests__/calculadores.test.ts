import {
  calcularTotalItems,
  calcularTotalPedido,
  verificarItensSemDivisao,
  calcularDivisaoConta,
} from '../calculadores';
import type { ItemCarrinho, Pedido, ItemDivisao } from '@/src/types';

describe('calculadores', () => {
  describe('calcularTotalItems', () => {
    it('deve calcular total de itens vazio corretamente', () => {
      const resultado = calcularTotalItems([]);
      expect(resultado).toBe(0);
    });

    it('deve calcular total de um único item', () => {
      const items: ItemCarrinho[] = [
        {
          id: '1',
          nome: 'Hambúrguer',
          descricao: 'Delicioso',
          preco: 25.90,
          categoria: 'Lanches',
          imagem: '/img.jpg',
          disponivel: true,
          quantidade: 1,
        },
      ];

      const resultado = calcularTotalItems(items);
      expect(resultado).toBe(25.90);
    });

    it('deve calcular total de múltiplos itens', () => {
      const items: ItemCarrinho[] = [
        {
          id: '1',
          nome: 'Hambúrguer',
          descricao: 'Delicioso',
          preco: 25.90,
          categoria: 'Lanches',
          imagem: '/img.jpg',
          disponivel: true,
          quantidade: 2,
        },
        {
          id: '2',
          nome: 'Refrigerante',
          descricao: 'Gelado',
          preco: 5.50,
          categoria: 'Bebidas',
          imagem: '/img.jpg',
          disponivel: true,
          quantidade: 3,
        },
      ];

      // (25.90 * 2) + (5.50 * 3) = 51.80 + 16.50 = 68.30
      const resultado = calcularTotalItems(items);
      expect(resultado).toBe(68.30);
    });

    it('deve lidar com quantidade zero', () => {
      const items: ItemCarrinho[] = [
        {
          id: '1',
          nome: 'Produto',
          descricao: 'Desc',
          preco: 10.00,
          categoria: 'Cat',
          imagem: '/img.jpg',
          disponivel: true,
          quantidade: 0,
        },
      ];

      const resultado = calcularTotalItems(items);
      expect(resultado).toBe(0);
    });
  });

  describe('calcularTotalPedido', () => {
    it('deve calcular total de pedido com múltiplos itens', () => {
      const pedido: Pedido = {
        id: '1',
        mesa: 'mesa-1',
        timestamp: Date.now(),
        status: 'pendente',
        itens: [
          {
            id: '1',
            nome: 'Pizza',
            descricao: 'Pizza grande',
            preco: 45.00,
            categoria: 'Pizzas',
            imagem: '/img.jpg',
            disponivel: true,
            quantidade: 1,
          },
          {
            id: '2',
            nome: 'Refrigerante',
            descricao: 'Lata',
            preco: 5.00,
            categoria: 'Bebidas',
            imagem: '/img.jpg',
            disponivel: true,
            quantidade: 2,
          },
        ],
      };

      // 45.00 + (5.00 * 2) = 55.00
      const resultado = calcularTotalPedido(pedido);
      expect(resultado).toBe(55.00);
    });

    it('deve retornar zero para pedido sem itens', () => {
      const pedido: Pedido = {
        id: '1',
        mesa: 'mesa-1',
        timestamp: Date.now(),
        status: 'pendente',
        itens: [],
      };

      const resultado = calcularTotalPedido(pedido);
      expect(resultado).toBe(0);
    });
  });

  describe('verificarItensSemDivisao', () => {
    it('deve retornar true quando há itens sem pessoa atribuída', () => {
      const itens: ItemDivisao[] = [
        {
          id: '1',
          nome: 'Item 1',
          preco: 10,
          quantidade: 1,
          pessoas: [],
        },
      ];

      const resultado = verificarItensSemDivisao(itens);
      expect(resultado).toBe(true);
    });

    it('deve retornar false quando todos os itens têm pessoas atribuídas', () => {
      const itens: ItemDivisao[] = [
        {
          id: '1',
          nome: 'Item 1',
          preco: 10,
          quantidade: 1,
          pessoas: [0, 1],
        },
        {
          id: '2',
          nome: 'Item 2',
          preco: 20,
          quantidade: 1,
          pessoas: [0],
        },
      ];

      const resultado = verificarItensSemDivisao(itens);
      expect(resultado).toBe(false);
    });

    it('deve retornar false para array vazio', () => {
      const resultado = verificarItensSemDivisao([]);
      expect(resultado).toBe(false);
    });
  });

  describe('calcularDivisaoConta', () => {
    it('deve dividir conta igualmente entre pessoas', () => {
      const itens: ItemDivisao[] = [
        {
          id: '1',
          nome: 'Pizza',
          preco: 60,
          quantidade: 1,
          pessoas: [0, 1, 2], // 3 pessoas dividem
        },
      ];

      const resultado = calcularDivisaoConta(itens, 3, 0.1);

      // Cada pessoa paga 20.00
      expect(resultado.totaisPorPessoa[0]).toBe(20);
      expect(resultado.totaisPorPessoa[1]).toBe(20);
      expect(resultado.totaisPorPessoa[2]).toBe(20);

      // Total da conta
      expect(resultado.totalConta).toBe(60);

      // Taxa de serviço (10%)
      expect(resultado.taxaServico).toBe(6);

      // Taxa por pessoa
      expect(resultado.taxaServicoIndividual).toBe(2);
    });

    it('deve calcular corretamente quando itens são divididos de forma diferente', () => {
      const itens: ItemDivisao[] = [
        {
          id: '1',
          nome: 'Hambúrguer',
          preco: 30,
          quantidade: 1,
          pessoas: [0], // Pessoa 0 paga sozinha
        },
        {
          id: '2',
          nome: 'Refrigerante',
          preco: 10,
          quantidade: 2,
          pessoas: [1, 2], // Pessoas 1 e 2 dividem
        },
      ];

      const resultado = calcularDivisaoConta(itens, 3, 0.1);

      // Pessoa 0: 30
      expect(resultado.totaisPorPessoa[0]).toBe(30);

      // Pessoa 1 e 2: 20 / 2 = 10 cada
      expect(resultado.totaisPorPessoa[1]).toBe(10);
      expect(resultado.totaisPorPessoa[2]).toBe(10);

      // Total: 30 + 20 = 50
      expect(resultado.totalConta).toBe(50);

      // Taxa: 5
      expect(resultado.taxaServico).toBe(5);

      // Taxa individual: 5 / 3 ≈ 1.67
      expect(resultado.taxaServicoIndividual).toBeCloseTo(1.67, 2);
    });

    it('deve ignorar itens sem pessoas atribuídas', () => {
      const itens: ItemDivisao[] = [
        {
          id: '1',
          nome: 'Item 1',
          preco: 50,
          quantidade: 1,
          pessoas: [0],
        },
        {
          id: '2',
          nome: 'Item sem divisão',
          preco: 100,
          quantidade: 1,
          pessoas: [],
        },
      ];

      const resultado = calcularDivisaoConta(itens, 2, 0);

      // Apenas o item 1 deve ser contabilizado
      expect(resultado.totaisPorPessoa[0]).toBe(50);
      expect(resultado.totaisPorPessoa[1]).toBe(0);
      expect(resultado.totalConta).toBe(50);
    });

    it('deve calcular corretamente sem taxa de serviço', () => {
      const itens: ItemDivisao[] = [
        {
          id: '1',
          nome: 'Pizza',
          preco: 40,
          quantidade: 1,
          pessoas: [0, 1],
        },
      ];

      const resultado = calcularDivisaoConta(itens, 2, 0);

      expect(resultado.totalConta).toBe(40);
      expect(resultado.taxaServico).toBe(0);
      expect(resultado.taxaServicoIndividual).toBe(0);
    });

    it('deve lidar com múltiplas quantidades', () => {
      const itens: ItemDivisao[] = [
        {
          id: '1',
          nome: 'Cerveja',
          preco: 5,
          quantidade: 4, // 4 cervejas = 20 total
          pessoas: [0, 1], // Dividido entre 2 pessoas
        },
      ];

      const resultado = calcularDivisaoConta(itens, 2, 0);

      // Total: 5 * 4 = 20
      // Dividido: 10 cada
      expect(resultado.totaisPorPessoa[0]).toBe(10);
      expect(resultado.totaisPorPessoa[1]).toBe(10);
      expect(resultado.totalConta).toBe(20);
    });
  });
});
