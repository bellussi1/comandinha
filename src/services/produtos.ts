import type { Produto } from "../types";

const PLACEHOLDER_IMAGE = "/placeholder.svg";

export const produtos: Produto[] = [
  {
    id: "1",
    nome: "Hambúrguer Artesanal",
    descricao:
      "Pão brioche, 180g de carne, queijo cheddar, bacon e molho especial",
    preco: 32.9,
    categoria: "principais",
    imagem: PLACEHOLDER_IMAGE,
    popular: true,
    tempoPreparo: 20,
    restricoes: [],
  },
  {
    id: "2",
    nome: "Batata Frita",
    descricao: "Porção de batatas fritas crocantes com sal e orégano",
    preco: 18.9,
    categoria: "entradas",
    imagem: PLACEHOLDER_IMAGE,
    tempoPreparo: 15,
    restricoes: ["vegetariano"],
  },
  {
    id: "3",
    nome: "Refrigerante",
    descricao: "Lata 350ml",
    preco: 6.9,
    categoria: "bebidas",
    imagem: PLACEHOLDER_IMAGE,
    tempoPreparo: 5,
    restricoes: ["vegetariano", "sem-gluten"],
  },
  {
    id: "4",
    nome: "Salada Caesar",
    descricao: "Alface americana, croutons, parmesão e molho caesar",
    preco: 24.9,
    categoria: "entradas",
    imagem: PLACEHOLDER_IMAGE,
    tempoPreparo: 10,
    restricoes: ["vegetariano"],
  },
  {
    id: "5",
    nome: "Pudim de Leite",
    descricao: "Pudim de leite condensado com calda de caramelo",
    preco: 14.9,
    categoria: "sobremesas",
    imagem: PLACEHOLDER_IMAGE,
    popular: true,
    tempoPreparo: 5,
    restricoes: ["vegetariano"],
  },
  {
    id: "6",
    nome: "Suco Natural",
    descricao: "Suco de laranja, abacaxi ou maracujá",
    preco: 9.9,
    categoria: "bebidas",
    imagem: PLACEHOLDER_IMAGE,
    tempoPreparo: 8,
    restricoes: ["vegetariano", "sem-gluten"],
  },
  {
    id: "7",
    nome: "Picanha Grelhada",
    descricao:
      "300g de picanha grelhada com batatas rústicas e molho chimichurri",
    preco: 69.9,
    categoria: "principais",
    imagem: PLACEHOLDER_IMAGE,
    tempoPreparo: 25,
    restricoes: [],
  },
  {
    id: "8",
    nome: "Sorvete Artesanal",
    descricao:
      "Duas bolas de sorvete artesanal nos sabores chocolate, creme ou morango",
    preco: 16.9,
    categoria: "sobremesas",
    imagem: PLACEHOLDER_IMAGE,
    tempoPreparo: 5,
    restricoes: ["vegetariano"],
  },
];

export const getProdutosPorCategoria = (categoria: string) => {
  if (categoria === "todos") return produtos;
  return produtos.filter((produto) => produto.categoria === categoria);
};

export const getProdutoById = (id: string) => {
  return produtos.find((produto) => produto.id === id);
};

export const filtrarProdutos = ({
  categoria,
  vegetariano,
  semGluten,
}: {
  categoria: string;
  vegetariano: boolean;
  semGluten: boolean;
}) => {
  let produtosFiltrados = getProdutosPorCategoria(categoria);

  if (vegetariano) {
    produtosFiltrados = produtosFiltrados.filter(
      (produto) =>
        produto.restricoes && produto.restricoes.includes("vegetariano")
    );
  }

  if (semGluten) {
    produtosFiltrados = produtosFiltrados.filter(
      (produto) =>
        produto.restricoes && produto.restricoes.includes("sem-gluten")
    );
  }

  return produtosFiltrados;
};
