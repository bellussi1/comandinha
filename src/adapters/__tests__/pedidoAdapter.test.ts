import { mapearPedidoAPI, mapearItensPedidoAPI, formatarPedidoParaAPI } from '../pedidoAdapter';
import type { PedidoAPI, ItemPedidoAPI } from '@/src/types';

describe('pedidoAdapter', () => {
  describe('mapearItensPedidoAPI', () => {
    it('deve mapear corretamente um array de itens da API', () => {
      const itensAPI: ItemPedidoAPI[] = [
        {
          produtoId: 1,
          nome: 'Hambúrguer',
          quantidade: 2,
          precoUnitario: 25.90,
          observacoes: 'Sem cebola',
        },
        {
          produtoId: 2,
          nome: 'Refrigerante',
          quantidade: 1,
          precoUnitario: 5.50,
          observacoes: null,
        },
      ];

      const resultado = mapearItensPedidoAPI(itensAPI);

      expect(resultado).toHaveLength(2);
      expect(resultado[0]).toEqual({
        id: '1',
        nome: 'Hambúrguer',
        descricao: '',
        preco: 25.90,
        categoria: '',
        imagem: '/placeholder.svg',
        disponivel: true,
        quantidade: 2,
        observacoes: 'Sem cebola',
      });
      expect(resultado[1]).toEqual({
        id: '2',
        nome: 'Refrigerante',
        descricao: '',
        preco: 5.50,
        categoria: '',
        imagem: '/placeholder.svg',
        disponivel: true,
        quantidade: 1,
        observacoes: undefined,
      });
    });

    it('deve retornar array vazio quando recebe array vazio', () => {
      const resultado = mapearItensPedidoAPI([]);
      expect(resultado).toEqual([]);
    });

    it('deve converter observacoes null para undefined', () => {
      const itensAPI: ItemPedidoAPI[] = [
        {
          produtoId: 1,
          nome: 'Produto',
          quantidade: 1,
          precoUnitario: 10.0,
          observacoes: null,
        },
      ];

      const resultado = mapearItensPedidoAPI(itensAPI);
      expect(resultado[0].observacoes).toBeUndefined();
    });
  });

  describe('mapearPedidoAPI', () => {
    it('deve mapear corretamente um pedido da API', () => {
      const pedidoAPI: PedidoAPI = {
        pedidoId: 123,
        timestamp: '2024-01-15T10:30:00.000Z',
        status: 'pendente',
        observacoesGerais: 'Pedido urgente',
        itens: [
          {
            produtoId: 1,
            nome: 'Pizza',
            quantidade: 1,
            precoUnitario: 45.00,
            observacoes: 'Bem assada',
          },
        ],
      };

      const resultado = mapearPedidoAPI(pedidoAPI, 'mesa-uuid-123');

      expect(resultado).toEqual({
        id: '123',
        itens: [
          {
            id: '1',
            nome: 'Pizza',
            descricao: '',
            preco: 45.00,
            categoria: '',
            imagem: '/placeholder.svg',
            disponivel: true,
            quantidade: 1,
            observacoes: 'Bem assada',
          },
        ],
        timestamp: new Date('2024-01-15T10:30:00.000Z').getTime(),
        status: 'pendente',
        mesa: 'mesa-uuid-123',
        observacoesGerais: 'Pedido urgente',
      });
    });

    it('deve converter observacoesGerais null para undefined', () => {
      const pedidoAPI: PedidoAPI = {
        pedidoId: 123,
        timestamp: '2024-01-15T10:30:00.000Z',
        status: 'pendente',
        observacoesGerais: null,
        itens: [],
      };

      const resultado = mapearPedidoAPI(pedidoAPI, 'mesa-uuid');
      expect(resultado.observacoesGerais).toBeUndefined();
    });

    it('deve converter timestamp string para number', () => {
      const pedidoAPI: PedidoAPI = {
        pedidoId: 123,
        timestamp: '2024-01-15T10:30:00.000Z',
        status: 'pendente',
        observacoesGerais: null,
        itens: [],
      };

      const resultado = mapearPedidoAPI(pedidoAPI, 'mesa-uuid');
      expect(typeof resultado.timestamp).toBe('number');
      expect(resultado.timestamp).toBe(new Date('2024-01-15T10:30:00.000Z').getTime());
    });
  });

  describe('formatarPedidoParaAPI', () => {
    it('deve formatar corretamente um pedido para envio à API', () => {
      const itens = [
        {
          id: '1',
          nome: 'Hambúrguer',
          quantidade: 2,
          observacoes: 'Sem cebola',
        },
        {
          id: '2',
          nome: 'Refrigerante',
          quantidade: 1,
        },
      ];

      const resultado = formatarPedidoParaAPI(
        'mesa-uuid-123',
        itens,
        'Pedido para viagem'
      );

      expect(resultado).toEqual({
        uuid: 'mesa-uuid-123',
        itens: [
          {
            produtoId: 1,
            quantidade: 2,
            observacoes: 'Sem cebola',
          },
          {
            produtoId: 2,
            quantidade: 1,
            observacoes: null,
          },
        ],
        observacoesGerais: 'Pedido para viagem',
      });
    });

    it('deve converter observacoes undefined para null', () => {
      const itens = [
        {
          id: '1',
          quantidade: 1,
          observacoes: undefined,
        },
      ];

      const resultado = formatarPedidoParaAPI('mesa-uuid', itens);
      expect(resultado.itens[0].observacoes).toBeNull();
    });

    it('deve converter observacoesGerais undefined para null', () => {
      const itens = [{ id: '1', quantidade: 1 }];
      const resultado = formatarPedidoParaAPI('mesa-uuid', itens);
      expect(resultado.observacoesGerais).toBeNull();
    });

    it('deve converter IDs string para number', () => {
      const itens = [
        {
          id: '999',
          quantidade: 1,
        },
      ];

      const resultado = formatarPedidoParaAPI('mesa-uuid', itens);
      expect(resultado.itens[0].produtoId).toBe(999);
      expect(typeof resultado.itens[0].produtoId).toBe('number');
    });
  });
});
