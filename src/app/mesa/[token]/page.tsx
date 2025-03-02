"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Bell,
  ShoppingCart,
  Clock,
  ChevronRight,
  Filter,
  Star,
  Plus,
  Minus,
  Receipt,
} from "lucide-react";
import { Button } from "../../../components/ui/button";
import { Card, CardContent } from "../../../components/ui/card";
import { Badge } from "../../../components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "../../../components/ui/tabs";
import { ThemeToggle } from "@/src/components/theme-toggle";
import { useToast } from "@/src/components/ui/use-toast";
import { Toaster } from "@/src/components/ui/toaster";
import { Checkbox } from "@/src/components/ui/checkbox";
import { X } from "lucide-react";

// Tipos
interface Produto {
  id: string;
  nome: string;
  descricao: string;
  preco: number;
  categoria: string;
  imagem: string;
  popular?: boolean;
  tempoPreparo?: number;
  restricoes?: string[];
}

interface ItemCarrinho extends Produto {
  quantidade: number;
  observacoes?: string;
  adicionais?: Array<{ nome: string; preco: number }>;
}

// Dados de exemplo
const produtos: Produto[] = [
  {
    id: "1",
    nome: "Hambúrguer Artesanal",
    descricao:
      "Pão brioche, 180g de carne, queijo cheddar, bacon e molho especial",
    preco: 32.9,
    categoria: "principais",
    imagem: "/placeholder.svg?height=200&width=300",
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
    imagem: "/placeholder.svg?height=200&width=300",
    tempoPreparo: 15,
    restricoes: ["vegetariano"],
  },
  {
    id: "3",
    nome: "Refrigerante",
    descricao: "Lata 350ml",
    preco: 6.9,
    categoria: "bebidas",
    imagem: "/placeholder.svg?height=200&width=300",
    tempoPreparo: 5,
    restricoes: ["vegetariano", "sem-gluten"],
  },
  {
    id: "4",
    nome: "Salada Caesar",
    descricao: "Alface americana, croutons, parmesão e molho caesar",
    preco: 24.9,
    categoria: "entradas",
    imagem: "/placeholder.svg?height=200&width=300",
    tempoPreparo: 10,
    restricoes: ["vegetariano"],
  },
  {
    id: "5",
    nome: "Pudim de Leite",
    descricao: "Pudim de leite condensado com calda de caramelo",
    preco: 14.9,
    categoria: "sobremesas",
    imagem: "/placeholder.svg?height=200&width=300",
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
    imagem: "/placeholder.svg?height=200&width=300",
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
    imagem: "/placeholder.svg?height=200&width=300",
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
    imagem: "/placeholder.svg?height=200&width=300",
    tempoPreparo: 5,
    restricoes: ["vegetariano"],
  },
];

export default function MenuPage() {
  const params = useParams();
  const { token } = params;
  const { toast } = useToast();
  const [carrinho, setCarrinho] = useState<ItemCarrinho[]>([]);
  const [produtoSelecionado, setProdutoSelecionado] = useState<Produto | null>(
    null
  );
  const [quantidade, setQuantidade] = useState(1);
  const [categoriaAtiva, setCategoriaAtiva] = useState("todos");
  const [modalProdutoAberto, setModalProdutoAberto] = useState(false);
  const [observacoes, setObservacoes] = useState("");

  const [filtroAtivo, setFiltroAtivo] = useState<string | null>(null);
  const [filtroVegetariano, setFiltroVegetariano] = useState(false);
  const [filtroSemGluten, setFiltroSemGluten] = useState(false);

  // Carregar carrinho do localStorage
  useEffect(() => {
    const carrinhoSalvo = localStorage.getItem(`carrinho-${token}`);
    if (carrinhoSalvo) {
      setCarrinho(JSON.parse(carrinhoSalvo));
    }
  }, [token]);

  // Salvar carrinho no localStorage quando atualizado
  useEffect(() => {
    if (carrinho.length > 0) {
      localStorage.setItem(`carrinho-${token}`, JSON.stringify(carrinho));
    }
  }, [carrinho, token]);

  const filtrarProdutosPorCategoria = (categoria: string) => {
    let produtosFiltrados = produtos;

    // Filtrar por categoria
    if (categoria !== "todos") {
      produtosFiltrados = produtosFiltrados.filter(
        (produto) => produto.categoria === categoria
      );
    }

    // Aplicar filtros adicionais
    if (filtroVegetariano) {
      produtosFiltrados = produtosFiltrados.filter(
        (produto) =>
          produto.restricoes && produto.restricoes.includes("vegetariano")
      );
    }

    if (filtroSemGluten) {
      produtosFiltrados = produtosFiltrados.filter(
        (produto) =>
          produto.restricoes && produto.restricoes.includes("sem-gluten")
      );
    }

    return produtosFiltrados;
  };

  const adicionarAoCarrinho = () => {
    if (!produtoSelecionado) return;

    const novoProdutoCarrinho: ItemCarrinho = {
      ...produtoSelecionado,
      quantidade,
      observacoes: observacoes.trim() || undefined,
    };

    setCarrinho((prev) => [...prev, novoProdutoCarrinho]);
    setModalProdutoAberto(false);
    setQuantidade(1);
    setObservacoes("");

    toast({
      title: "Produto adicionado",
      description: `${novoProdutoCarrinho.nome} foi adicionado ao seu pedido`,
      duration: 3000,
    });
  };

  const abrirModalProduto = (produto: Produto) => {
    setProdutoSelecionado(produto);
    setModalProdutoAberto(true);
  };

  const fecharModalProduto = () => {
    setModalProdutoAberto(false);
    setProdutoSelecionado(null);
    setQuantidade(1);
    setObservacoes("");
  };

  const incrementarQuantidade = () => setQuantidade((prev) => prev + 1);
  const decrementarQuantidade = () =>
    setQuantidade((prev) => (prev > 1 ? prev - 1 : 1));

  const totalCarrinho = carrinho.reduce((total, item) => {
    return total + item.preco * item.quantidade;
  }, 0);

  const totalItensCarrinho = carrinho.reduce((total, item) => {
    return total + item.quantidade;
  }, 0);

  const chamarGarcom = () => {
    toast({
      title: "Garçom chamado",
      description: "Um garçom virá até sua mesa em instantes",
      duration: 5000,
    });
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background border-b">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h1 className="font-bold text-lg">Mesa {token}</h1>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="icon"
              className="rounded-full"
              asChild
            >
              <Link href={`/mesa/${token}/pedidos`}>
                <Receipt className="h-5 w-5" />
                <span className="sr-only">Ver pedidos</span>
              </Link>
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="rounded-full"
              onClick={chamarGarcom}
            >
              <Bell className="h-5 w-5" />
              <span className="sr-only">Chamar garçom</span>
            </Button>
            <ThemeToggle />
            <Button
              variant="outline"
              size="icon"
              className="rounded-full relative"
              asChild
            >
              <Link href={`/mesa/${token}/carrinho`}>
                <ShoppingCart className="h-5 w-5" />
                {totalItensCarrinho > 0 && (
                  <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0">
                    {totalItensCarrinho}
                  </Badge>
                )}
                <span className="sr-only">Ver carrinho</span>
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Categorias */}
      <div className="sticky top-[57px] z-10 bg-background border-b">
        <div className="container mx-auto px-4 py-2">
          <Tabs
            defaultValue="todos"
            value={categoriaAtiva}
            onValueChange={setCategoriaAtiva}
          >
            <TabsList className="w-full overflow-x-auto flex justify-start p-1 h-auto">
              <TabsTrigger value="todos" className="px-3 py-1.5">
                Todos
              </TabsTrigger>
              <TabsTrigger value="entradas" className="px-3 py-1.5">
                Entradas
              </TabsTrigger>
              <TabsTrigger value="principais" className="px-3 py-1.5">
                Principais
              </TabsTrigger>
              <TabsTrigger value="bebidas" className="px-3 py-1.5">
                Bebidas
              </TabsTrigger>
              <TabsTrigger value="sobremesas" className="px-3 py-1.5">
                Sobremesas
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Conteúdo principal */}
      <main className="flex-1 container mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Cardápio</h2>
          <Button
            variant="outline"
            size="sm"
            className="gap-1"
            onClick={() => setFiltroAtivo("filtros")}
          >
            <Filter className="h-4 w-4" />
            Filtros
            {(filtroVegetariano || filtroSemGluten) && (
              <Badge className="ml-1 h-5 w-5 flex items-center justify-center p-0">
                {(filtroVegetariano ? 1 : 0) + (filtroSemGluten ? 1 : 0)}
              </Badge>
            )}
          </Button>
        </div>

        {/* Lista de produtos */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtrarProdutosPorCategoria(categoriaAtiva).map((produto) => (
            <Card
              key={produto.id}
              className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => abrirModalProduto(produto)}
            >
              <div className="relative h-48">
                <Image
                  src={produto.imagem || "/placeholder.svg"}
                  alt={produto.nome}
                  fill
                  className="object-cover"
                />
                {produto.popular && (
                  <Badge className="absolute top-2 right-2 bg-primary">
                    <Star className="h-3 w-3 mr-1" /> Popular
                  </Badge>
                )}
              </div>
              <CardContent className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-semibold">{produto.nome}</h3>
                  <span className="font-bold text-primary">
                    R$ {produto.preco.toFixed(2).replace(".", ",")}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                  {produto.descricao}
                </p>
                <div className="flex items-center text-xs text-muted-foreground">
                  <Clock className="h-3 w-3 mr-1" />
                  {produto.tempoPreparo} min
                  {produto.restricoes && produto.restricoes.length > 0 && (
                    <div className="flex ml-3 gap-1">
                      {produto.restricoes.includes("vegetariano") && (
                        <Badge variant="outline" className="text-xs px-1 h-5">
                          Veg
                        </Badge>
                      )}
                      {produto.restricoes.includes("sem-gluten") && (
                        <Badge variant="outline" className="text-xs px-1 h-5">
                          S/G
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>

      {/* Modal de filtros */}
      {filtroAtivo && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center">
          <div className="bg-background w-full max-w-md rounded-t-lg sm:rounded-lg shadow-lg overflow-hidden">
            <div className="p-4 border-b">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-lg">Filtros</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setFiltroAtivo(null)}
                >
                  <X className="h-4 w-4" />
                  <span className="sr-only">Fechar</span>
                </Button>
              </div>
            </div>

            <div className="p-4 space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="vegetariano"
                  checked={filtroVegetariano}
                  onCheckedChange={(checked) =>
                    setFiltroVegetariano(checked === true)
                  }
                />
                <label
                  htmlFor="vegetariano"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Vegetariano
                </label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="sem-gluten"
                  checked={filtroSemGluten}
                  onCheckedChange={(checked) =>
                    setFiltroSemGluten(checked === true)
                  }
                />
                <label
                  htmlFor="sem-gluten"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Sem Glúten
                </label>
              </div>
            </div>

            <div className="p-4 border-t flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setFiltroVegetariano(false);
                  setFiltroSemGluten(false);
                  setFiltroAtivo(null);
                }}
              >
                Limpar
              </Button>
              <Button onClick={() => setFiltroAtivo(null)}>Aplicar</Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de produto */}
      {modalProdutoAberto && produtoSelecionado && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center">
          <div className="bg-background w-full max-w-md rounded-t-lg sm:rounded-lg shadow-lg overflow-hidden max-h-[90vh] flex flex-col">
            <div className="relative h-64">
              <Image
                src={produtoSelecionado.imagem || "/placeholder.svg"}
                alt={produtoSelecionado.nome}
                fill
                className="object-cover"
              />
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 rounded-full bg-background/50 hover:bg-background/70"
                onClick={fecharModalProduto}
              >
                <span className="sr-only">Fechar</span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="lucide lucide-x"
                >
                  <path d="M18 6 6 18" />
                  <path d="m6 6 12 12" />
                </svg>
              </Button>
            </div>

            <div className="p-4 overflow-y-auto flex-1">
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-xl font-bold">{produtoSelecionado.nome}</h3>
                <span className="font-bold text-primary text-lg">
                  R$ {produtoSelecionado.preco.toFixed(2).replace(".", ",")}
                </span>
              </div>

              <p className="text-muted-foreground mb-4">
                {produtoSelecionado.descricao}
              </p>

              <div className="flex items-center text-sm text-muted-foreground mb-6">
                <Clock className="h-4 w-4 mr-1" />
                {produtoSelecionado.tempoPreparo} min
                {produtoSelecionado.restricoes &&
                  produtoSelecionado.restricoes.length > 0 && (
                    <div className="flex ml-3 gap-1">
                      {produtoSelecionado.restricoes.includes(
                        "vegetariano"
                      ) && <Badge variant="outline">Vegetariano</Badge>}
                      {produtoSelecionado.restricoes.includes("sem-gluten") && (
                        <Badge variant="outline">Sem Glúten</Badge>
                      )}
                    </div>
                  )}
              </div>

              <div className="mb-4">
                <label
                  htmlFor="observacoes"
                  className="block text-sm font-medium mb-2"
                >
                  Observações
                </label>
                <textarea
                  id="observacoes"
                  className="w-full p-3 border rounded-md h-24 bg-background"
                  placeholder="Ex: Sem cebola, molho à parte..."
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                />
              </div>

              <div className="flex items-center justify-between mb-6">
                <span className="font-medium">Quantidade</span>
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={decrementarQuantidade}
                    disabled={quantidade <= 1}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="w-8 text-center font-medium">
                    {quantidade}
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={incrementarQuantidade}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="flex justify-between items-center font-bold text-lg mb-4">
                <span>Total</span>
                <span className="text-primary">
                  R${" "}
                  {(produtoSelecionado.preco * quantidade)
                    .toFixed(2)
                    .replace(".", ",")}
                </span>
              </div>
            </div>

            <div className="p-4 border-t">
              <Button className="w-full" onClick={adicionarAoCarrinho}>
                Adicionar ao pedido
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Botão flutuante do carrinho */}
      {carrinho.length > 0 && (
        <div className="fixed bottom-4 right-4 left-4 z-10">
          <Button
            className="w-full shadow-lg gap-2 justify-between py-6"
            asChild
          >
            <Link href={`/mesa/${token}/carrinho`}>
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                <span>
                  {totalItensCarrinho}{" "}
                  {totalItensCarrinho === 1 ? "item" : "itens"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span>R$ {totalCarrinho.toFixed(2).replace(".", ",")}</span>
                <ChevronRight className="h-5 w-5" />
              </div>
            </Link>
          </Button>
        </div>
      )}

      <Toaster />
    </div>
  );
}
