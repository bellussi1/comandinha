import { mapearProdutoAPI, mapearProdutosAPI } from '../produtoAdapter';

describe('produtoAdapter', () => {
  describe('mapearProdutoAPI', () => {
    it('deve mapear produto completo da API', () => {
      const produtoAPI = {
        id: 123,
        nome: 'Hambúrguer Artesanal',
        descricao: 'Delicioso hambúrguer com ingredientes frescos',
        preco: 35.90,
        categoriaId: 5,
        imagemUrl: '/images/hamburger.jpg',
        disponivel: true,
        popular: true,
        tempoPreparoMinutos: 20,
        restricoes: ['gluten'],
      };

      const resultado = mapearProdutoAPI(produtoAPI);

      expect(resultado).toEqual({
        id: '123',
        nome: 'Hambúrguer Artesanal',
        descricao: 'Delicioso hambúrguer com ingredientes frescos',
        preco: 35.90,
        categoria: '5',
        imagem: '/images/hamburger.jpg',
        disponivel: true,
        popular: true,
        tempoPreparo: 20,
        restricoes: ['gluten'],
      });
    });

    it('deve usar valores padrão para campos opcionais', () => {
      const produtoAPI = {
        id: 1,
        nome: 'Produto Simples',
        preco: 10.00,
      };

      const resultado = mapearProdutoAPI(produtoAPI);

      expect(resultado.id).toBe('1');
      expect(resultado.nome).toBe('Produto Simples');
      expect(resultado.preco).toBe(10.00);
      expect(resultado.descricao).toBe('');
      expect(resultado.categoria).toBe('outros');
      expect(resultado.imagem).toBe('/placeholder.svg');
      expect(resultado.disponivel).toBe(true);
      expect(resultado.popular).toBe(false);
      expect(resultado.tempoPreparo).toBe(15);
      expect(resultado.restricoes).toEqual([]);
    });

    it('deve converter ID numérico para string', () => {
      const produtoAPI = {
        id: 999,
        nome: 'Produto',
        preco: 5.00,
      };

      const resultado = mapearProdutoAPI(produtoAPI);

      expect(resultado.id).toBe('999');
      expect(typeof resultado.id).toBe('string');
    });

    it('deve converter categoriaId para string', () => {
      const produtoAPI = {
        id: 1,
        nome: 'Produto',
        preco: 5.00,
        categoriaId: 42,
      };

      const resultado = mapearProdutoAPI(produtoAPI);

      expect(resultado.categoria).toBe('42');
      expect(typeof resultado.categoria).toBe('string');
    });

    it('deve usar "outros" quando categoriaId é null', () => {
      const produtoAPI = {
        id: 1,
        nome: 'Produto',
        preco: 5.00,
        categoriaId: null,
      };

      const resultado = mapearProdutoAPI(produtoAPI);

      expect(resultado.categoria).toBe('outros');
    });

    it('deve usar "outros" quando categoriaId é undefined', () => {
      const produtoAPI = {
        id: 1,
        nome: 'Produto',
        preco: 5.00,
        categoriaId: undefined,
      };

      const resultado = mapearProdutoAPI(produtoAPI);

      expect(resultado.categoria).toBe('outros');
    });

    it('deve usar placeholder quando imagemUrl é null', () => {
      const produtoAPI = {
        id: 1,
        nome: 'Produto',
        preco: 5.00,
        imagemUrl: null,
      };

      const resultado = mapearProdutoAPI(produtoAPI);

      expect(resultado.imagem).toBe('/placeholder.svg');
    });

    it('deve usar placeholder quando imagemUrl é string vazia', () => {
      const produtoAPI = {
        id: 1,
        nome: 'Produto',
        preco: 5.00,
        imagemUrl: '',
      };

      const resultado = mapearProdutoAPI(produtoAPI);

      expect(resultado.imagem).toBe('/placeholder.svg');
    });

    it('deve respeitar disponivel=false explicitamente', () => {
      const produtoAPI = {
        id: 1,
        nome: 'Produto Indisponível',
        preco: 5.00,
        disponivel: false,
      };

      const resultado = mapearProdutoAPI(produtoAPI);

      expect(resultado.disponivel).toBe(false);
    });

    it('deve usar disponivel=true quando não especificado', () => {
      const produtoAPI = {
        id: 1,
        nome: 'Produto',
        preco: 5.00,
      };

      const resultado = mapearProdutoAPI(produtoAPI);

      expect(resultado.disponivel).toBe(true);
    });

    it('deve mapear corretamente campo popular', () => {
      const produtoComPopular = {
        id: 1,
        nome: 'Produto Popular',
        preco: 5.00,
        popular: true,
      };

      const resultado = mapearProdutoAPI(produtoComPopular);
      expect(resultado.popular).toBe(true);

      const produtoSemPopular = {
        id: 2,
        nome: 'Produto Normal',
        preco: 5.00,
      };

      const resultado2 = mapearProdutoAPI(produtoSemPopular);
      expect(resultado2.popular).toBe(false);
    });

    it('deve mapear tempoPreparoMinutos para tempoPreparo', () => {
      const produtoAPI = {
        id: 1,
        nome: 'Pizza',
        preco: 45.00,
        tempoPreparoMinutos: 30,
      };

      const resultado = mapearProdutoAPI(produtoAPI);

      expect(resultado.tempoPreparo).toBe(30);
    });

    it('deve usar tempo padrão de 15 minutos quando não especificado', () => {
      const produtoAPI = {
        id: 1,
        nome: 'Produto',
        preco: 5.00,
      };

      const resultado = mapearProdutoAPI(produtoAPI);

      expect(resultado.tempoPreparo).toBe(15);
    });

    it('deve mapear array de restrições', () => {
      const produtoAPI = {
        id: 1,
        nome: 'Produto',
        preco: 5.00,
        restricoes: ['gluten', 'lactose', 'nuts'],
      };

      const resultado = mapearProdutoAPI(produtoAPI);

      expect(resultado.restricoes).toEqual(['gluten', 'lactose', 'nuts']);
    });

    it('deve usar array vazio quando restrições não especificadas', () => {
      const produtoAPI = {
        id: 1,
        nome: 'Produto',
        preco: 5.00,
      };

      const resultado = mapearProdutoAPI(produtoAPI);

      expect(resultado.restricoes).toEqual([]);
    });

    it('deve converter descrição null para string vazia', () => {
      const produtoAPI = {
        id: 1,
        nome: 'Produto',
        preco: 5.00,
        descricao: null,
      };

      const resultado = mapearProdutoAPI(produtoAPI);

      expect(resultado.descricao).toBe('');
    });
  });

  describe('mapearProdutosAPI', () => {
    it('deve mapear array vazio', () => {
      const resultado = mapearProdutosAPI([]);
      expect(resultado).toEqual([]);
    });

    it('deve mapear array com um produto', () => {
      const produtosAPI = [
        {
          id: 1,
          nome: 'Produto 1',
          preco: 10.00,
        },
      ];

      const resultado = mapearProdutosAPI(produtosAPI);

      expect(resultado).toHaveLength(1);
      expect(resultado[0].id).toBe('1');
      expect(resultado[0].nome).toBe('Produto 1');
    });

    it('deve mapear array com múltiplos produtos', () => {
      const produtosAPI = [
        {
          id: 1,
          nome: 'Produto 1',
          preco: 10.00,
          disponivel: true,
        },
        {
          id: 2,
          nome: 'Produto 2',
          preco: 20.00,
          disponivel: false,
        },
        {
          id: 3,
          nome: 'Produto 3',
          preco: 30.00,
          popular: true,
        },
      ];

      const resultado = mapearProdutosAPI(produtosAPI);

      expect(resultado).toHaveLength(3);

      expect(resultado[0].id).toBe('1');
      expect(resultado[0].disponivel).toBe(true);

      expect(resultado[1].id).toBe('2');
      expect(resultado[1].disponivel).toBe(false);

      expect(resultado[2].id).toBe('3');
      expect(resultado[2].popular).toBe(true);
    });

    it('deve manter ordem dos produtos', () => {
      const produtosAPI = [
        { id: 5, nome: 'E', preco: 5 },
        { id: 3, nome: 'C', preco: 3 },
        { id: 1, nome: 'A', preco: 1 },
        { id: 4, nome: 'D', preco: 4 },
        { id: 2, nome: 'B', preco: 2 },
      ];

      const resultado = mapearProdutosAPI(produtosAPI);

      expect(resultado.map(p => p.id)).toEqual(['5', '3', '1', '4', '2']);
      expect(resultado.map(p => p.nome)).toEqual(['E', 'C', 'A', 'D', 'B']);
    });

    it('deve aplicar valores padrão para todos os produtos', () => {
      const produtosAPI = [
        { id: 1, nome: 'P1', preco: 10 },
        { id: 2, nome: 'P2', preco: 20 },
      ];

      const resultado = mapearProdutosAPI(produtosAPI);

      resultado.forEach(produto => {
        expect(produto.descricao).toBe('');
        expect(produto.categoria).toBe('outros');
        expect(produto.imagem).toBe('/placeholder.svg');
        expect(produto.disponivel).toBe(true);
        expect(produto.popular).toBe(false);
        expect(produto.tempoPreparo).toBe(15);
        expect(produto.restricoes).toEqual([]);
      });
    });
  });
});
