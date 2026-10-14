import { renderHook, act } from '@testing-library/react';
import { CarrinhoProvider, useCarrinho } from '../CarrinhoContext';
import type { ItemCarrinho } from '@/src/types';
import * as carrinhoService from '@/src/services/carrinho';

// Mock do serviço de carrinho
jest.mock('@/src/services/carrinho');

// Mock do calculador de totais
jest.mock('@/src/utils/calculadores', () => ({
  calcularTotalItems: (items: ItemCarrinho[]) =>
    items.reduce((total, item) => total + item.preco * item.quantidade, 0),
}));

describe('CarrinhoContext', () => {
  const mockMesa = 'mesa-teste';

  const mockItem: ItemCarrinho = {
    id: '1',
    nome: 'Hambúrguer',
    descricao: 'Delicioso hambúrguer',
    preco: 25.90,
    categoria: 'Lanches',
    imagem: '/hamburger.jpg',
    disponivel: true,
    quantidade: 1,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    (carrinhoService.getCarrinho as jest.Mock).mockReturnValue([]);
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <CarrinhoProvider mesa={mockMesa}>{children}</CarrinhoProvider>
  );

  describe('Inicialização', () => {
    it('deve carregar carrinho vazio do localStorage na inicialização', () => {
      (carrinhoService.getCarrinho as jest.Mock).mockReturnValue([]);

      const { result } = renderHook(() => useCarrinho(), { wrapper });

      expect(carrinhoService.getCarrinho).toHaveBeenCalledWith(mockMesa);
      expect(result.current.items).toEqual([]);
      expect(result.current.totalItems).toBe(0);
      expect(result.current.totalValor).toBe(0);
    });

    it('deve carregar carrinho existente do localStorage', () => {
      const mockCarrinhoExistente = [mockItem];
      (carrinhoService.getCarrinho as jest.Mock).mockReturnValue(mockCarrinhoExistente);

      const { result } = renderHook(() => useCarrinho(), { wrapper });

      expect(result.current.items).toEqual(mockCarrinhoExistente);
      expect(result.current.totalItems).toBe(1);
      expect(result.current.totalValor).toBe(25.90);
    });
  });

  describe('adicionarItem', () => {
    it('deve adicionar item ao carrinho', () => {
      const { result } = renderHook(() => useCarrinho(), { wrapper });

      (carrinhoService.getCarrinho as jest.Mock).mockReturnValue([mockItem]);

      act(() => {
        result.current.adicionarItem(mockItem);
      });

      expect(carrinhoService.adicionarItem).toHaveBeenCalledWith(mockMesa, mockItem);
      expect(result.current.items).toEqual([mockItem]);
    });

    it('deve atualizar totais após adicionar item', () => {
      const { result } = renderHook(() => useCarrinho(), { wrapper });

      (carrinhoService.getCarrinho as jest.Mock).mockReturnValue([mockItem]);

      act(() => {
        result.current.adicionarItem(mockItem);
      });

      expect(result.current.totalItems).toBe(1);
      expect(result.current.totalValor).toBe(25.90);
    });
  });

  describe('removerItem', () => {
    it('deve remover item do carrinho', () => {
      (carrinhoService.getCarrinho as jest.Mock)
        .mockReturnValueOnce([mockItem])  // Initial load
        .mockReturnValueOnce([]);          // After removal

      const { result } = renderHook(() => useCarrinho(), { wrapper });

      act(() => {
        result.current.removerItem('1');
      });

      expect(carrinhoService.removerItem).toHaveBeenCalledWith(mockMesa, '1');
      expect(result.current.items).toEqual([]);
    });

    it('deve atualizar totais após remover item', () => {
      (carrinhoService.getCarrinho as jest.Mock)
        .mockReturnValueOnce([mockItem])
        .mockReturnValueOnce([]);

      const { result } = renderHook(() => useCarrinho(), { wrapper });

      act(() => {
        result.current.removerItem('1');
      });

      expect(result.current.totalItems).toBe(0);
      expect(result.current.totalValor).toBe(0);
    });
  });

  describe('atualizarQuantidade', () => {
    it('deve atualizar quantidade de um item', () => {
      const itemAtualizado = { ...mockItem, quantidade: 3 };

      (carrinhoService.getCarrinho as jest.Mock)
        .mockReturnValueOnce([mockItem])
        .mockReturnValueOnce([itemAtualizado]);

      const { result } = renderHook(() => useCarrinho(), { wrapper });

      act(() => {
        result.current.atualizarQuantidade('1', 3);
      });

      expect(carrinhoService.atualizarQuantidade).toHaveBeenCalledWith(mockMesa, '1', 3);
      expect(result.current.items[0].quantidade).toBe(3);
    });

    it('deve recalcular totais após atualizar quantidade', () => {
      const itemAtualizado = { ...mockItem, quantidade: 2 };

      (carrinhoService.getCarrinho as jest.Mock)
        .mockReturnValueOnce([mockItem])
        .mockReturnValueOnce([itemAtualizado]);

      const { result } = renderHook(() => useCarrinho(), { wrapper });

      act(() => {
        result.current.atualizarQuantidade('1', 2);
      });

      expect(result.current.totalItems).toBe(2);
      expect(result.current.totalValor).toBe(51.80);
    });
  });

  describe('limparCarrinho', () => {
    it('deve limpar todos os itens do carrinho', () => {
      (carrinhoService.getCarrinho as jest.Mock)
        .mockReturnValueOnce([mockItem])
        .mockReturnValueOnce([]);

      const { result } = renderHook(() => useCarrinho(), { wrapper });

      act(() => {
        result.current.limparCarrinho();
      });

      expect(carrinhoService.limparCarrinho).toHaveBeenCalledWith(mockMesa);
      expect(result.current.items).toEqual([]);
      expect(result.current.totalItems).toBe(0);
      expect(result.current.totalValor).toBe(0);
    });
  });

  describe('useCarrinho hook', () => {
    it('deve lançar erro quando usado fora do Provider', () => {
      // Suppress console.error for this test
      const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        renderHook(() => useCarrinho());
      }).toThrow('useCarrinho deve ser usado dentro de CarrinhoProvider');

      consoleError.mockRestore();
    });
  });

  describe('Memoização', () => {
    it('deve memoizar funções callback para evitar re-renders desnecessários', () => {
      const { result, rerender } = renderHook(() => useCarrinho(), { wrapper });

      const initialAdicionarItem = result.current.adicionarItem;
      const initialRemoverItem = result.current.removerItem;
      const initialAtualizarQuantidade = result.current.atualizarQuantidade;
      const initialLimparCarrinho = result.current.limparCarrinho;

      // Force re-render
      rerender();

      // Functions should remain the same reference
      expect(result.current.adicionarItem).toBe(initialAdicionarItem);
      expect(result.current.removerItem).toBe(initialRemoverItem);
      expect(result.current.atualizarQuantidade).toBe(initialAtualizarQuantidade);
      expect(result.current.limparCarrinho).toBe(initialLimparCarrinho);
    });
  });
});
