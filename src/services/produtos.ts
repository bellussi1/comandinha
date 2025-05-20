import api from "./api";
import type { Produto, CategoriaProduto } from "../types";

export const getProdutosPorCategoria = async (
  categoria: CategoriaProduto
): Promise<Produto[]> => {
  try {
    if (categoria === "todos") {
      const response = await api.get("/produtos");
      return response.data;
    } else {
      // Primeiro precisamos obter o ID da categoria
      const categorias = await api.get("/categorias/");
      const categoriaObj = categorias.data.find(
        (cat: any) => cat.nome.toLowerCase() === categoria.toLowerCase()
      );

      if (!categoriaObj) return [];

      const response = await api.get(`/categorias/${categoriaObj.id}/produtos`);
      return mapearProdutosAPI(response.data);
    }
  } catch (error) {
    console.error("Erro ao buscar produtos por categoria:", error);
    return [];
  }
};

export const getProdutoById = async (id: string): Promise<Produto | null> => {
  try {
    const response = await api.get(`/produtos/${id}`);
    return mapearProdutoAPI(response.data);
  } catch (error) {
    console.error("Erro ao buscar produto por ID:", error);
    return null;
  }
};

export const filtrarProdutos = async ({
  categoria,
  vegetariano,
  semGluten,
}: {
  categoria: CategoriaProduto;
  vegetariano: boolean;
  semGluten: boolean;
}): Promise<Produto[]> => {
  try {
    let produtos: Produto[] = [];

    // Buscar produtos por categoria
    produtos = await getProdutosPorCategoria(categoria);

    // Aplicar filtros no client-side (a API não tem endpoint específico para esses filtros)
    if (vegetariano) {
      produtos = produtos.filter(
        (produto) =>
          produto.restricoes && produto.restricoes.includes("vegetariano")
      );
    }

    if (semGluten) {
      produtos = produtos.filter(
        (produto) =>
          produto.restricoes && produto.restricoes.includes("sem-gluten")
      );
    }

    return produtos;
  } catch (error) {
    console.error("Erro ao filtrar produtos:", error);
    return [];
  }
};

// Função auxiliar para mapear produtos da API para o formato esperado pelo front
function mapearProdutoAPI(produtoAPI: any): Produto {
  return {
    id: produtoAPI.id.toString(),
    nome: produtoAPI.nome,
    descricao: produtoAPI.descricao || "",
    preco: produtoAPI.preco,
    categoria: produtoAPI.categoriaId
      ? produtoAPI.categoriaId.toString()
      : "outros",
    imagem: produtoAPI.imagemUrl || "/placeholder.svg",
    popular: produtoAPI.popular || false,
    tempoPreparo: produtoAPI.tempoPreparoMinutos || 15,
    restricoes: produtoAPI.restricoes || [],
  };
}

function mapearProdutosAPI(produtosAPI: any[]): Produto[] {
  return produtosAPI.map(mapearProdutoAPI);
}

export const getProdutosRecomendados = async (
  limite: number = 5
): Promise<Produto[]> => {
  try {
    const response = await api.get(`/produtos/recomendados?limite=${limite}`);
    return mapearProdutosAPI(response.data);
  } catch (error) {
    console.error("Erro ao buscar produtos recomendados:", error);
    return [];
  }
};
