"use client";

import { ModalFiltros, ModalProduto, ProdutoCard } from "@/src/components/menu";
import { ThemeToggle } from "@/src/components/theme-toggle";
import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/src/components/ui/tabs";
import { Toaster } from "@/src/components/ui/toaster";
import { useToast } from "@/src/components/ui/use-toast";
import { adicionarItem, getCarrinho } from "@/src/services/carrinho";
import { getCategorias } from "@/src/services/categoria";
import { getMesaPorUuid, Mesa } from "@/src/services/mesa";
import {
  filtrarProdutos,
  getProdutos,
  getProdutosPorCategoria,
} from "@/src/services/produtos";
import type { Categoria, ItemCarrinho, Produto } from "@/src/types";
import {
  ChevronRight,
  Filter,
  Loader2,
  Receipt,
  ShoppingCart,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

export default function MenuPage() {
  const params = useParams();
  const router = useRouter();
  const { token } = params;
  const { toast } = useToast();

  const [mesa, setMesa] = useState<Mesa | null>(null);
  const [carrinho, setCarrinho] = useState<ItemCarrinho[]>([]);
  const [produtoSelecionado, setProdutoSelecionado] = useState<Produto | null>(
    null
  );
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [categoriaAtiva, setCategoriaAtiva] = useState<number>(0);
  const [modalProdutoAberto, setModalProdutoAberto] = useState(false);
  const [modalFiltrosAberto, setModalFiltrosAberto] = useState(false);
  const [filtroVegetariano, setFiltroVegetariano] = useState(false);
  const [filtroSemGluten, setFiltroSemGluten] = useState(false);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [loading, setLoading] = useState(true);

  // Carregar dados da mesa
  useEffect(() => {
    const carregarMesa = async () => {
      if (typeof token === "string") {
        try {
          const dadosMesa = await getMesaPorUuid(token);
          setMesa(dadosMesa);
        } catch (error) {
          console.error("Erro ao carregar dados da mesa:", error);
        }
      }
    };
    carregarMesa();
  }, [token]);

  // Carregar carrinho do localStorage
  useEffect(() => {
    if (typeof token === "string") {
      const carrinhoSalvo = getCarrinho(token);
      setCarrinho(carrinhoSalvo);
    }
  }, [token]);

  // Carregar Categorias
  useEffect(() => {
    const carregarCategorias = async () => {
      try {
        const lista = await getCategorias();
        setCategorias(lista);
      } catch (error) {
        console.error("Erro ao carregar categorias:", error);
      }
    };
    carregarCategorias();
  }, []);

  useEffect(() => {
    const carregarProdutos = async () => {
      setLoading(true);

      try {
        // Buscar produtos: se categoriaAtiva === 0 pega todos, senão apenas da categoria
        const produtosCarregados: Produto[] =
          categoriaAtiva === 0
            ? await getProdutos()
            : await getProdutosPorCategoria(categoriaAtiva);

        // Aplicar filtros no client-side
        const produtosFiltrados = produtosCarregados.filter((produto) => {
          if (
            filtroVegetariano &&
            (!produto.restricoes || !produto.restricoes.includes("vegetariano"))
          ) {
            return false;
          }
          if (
            filtroSemGluten &&
            (!produto.restricoes || !produto.restricoes.includes("sem gluten"))
          ) {
            return false;
          }
          return true;
        });

        setProdutos(produtosFiltrados);
      } catch (error) {
        console.error("Erro ao carregar produtos:", error);
        setProdutos([]);
      } finally {
        setLoading(false);
      }
    };

    carregarProdutos();
  }, [categoriaAtiva, filtroVegetariano, filtroSemGluten]);

  // Handlers
  const abrirModalProduto = (produto: Produto) => {
    setProdutoSelecionado(produto);
    setModalProdutoAberto(true);
  };

  const fecharModalProduto = () => {
    setModalProdutoAberto(false);
    setTimeout(() => setProdutoSelecionado(null), 300);
  };

  const adicionarAoCarrinho = (
    produto: Produto,
    quantidade: number,
    observacoes: string
  ) => {
    if (typeof token !== "string") return;

    const item: ItemCarrinho = {
      ...produto,
      quantidade,
      observacoes: observacoes || undefined,
    };

    adicionarItem(token, item);
    setCarrinho(getCarrinho(token));

    toast({
      title: "Item adicionado",
      description: `${quantidade}x ${produto.nome} adicionado ao pedido`,
    });
  };

  const limparFiltros = () => {
    setFiltroVegetariano(false);
    setFiltroSemGluten(false);
    setCategoriaAtiva(1);
  };

  const aplicarFiltros = (vegetariano: boolean, semGluten: boolean) => {
    setFiltroVegetariano(vegetariano);
    setFiltroSemGluten(semGluten);
  };

  // Cálculos do carrinho
  const totalItensCarrinho = useMemo(
    () => carrinho.reduce((total, item) => total + item.quantidade, 0),
    [carrinho]
  );

  const totalCarrinho = useMemo(
    () =>
      carrinho.reduce((total, item) => total + item.preco * item.quantidade, 0),
    [carrinho]
  );

  const filtrosAtivos = filtroVegetariano || filtroSemGluten;
  const quantidadeFiltros =
    (filtroVegetariano ? 1 : 0) + (filtroSemGluten ? 1 : 0);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background border-b">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h1 className="font-bold text-lg">
              {mesa ? mesa.nome : "Carregando..."}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="icon"
              className="rounded-full"
              asChild
            >
              <Link
                href={`/mesa/${typeof token === "string" ? token : ""}/pedidos`}
              >
                <Receipt className="h-5 w-5" />
                <span className="sr-only">Ver pedidos</span>
              </Link>
            </Button>

            <ThemeToggle />

            <Button
              variant="outline"
              size="icon"
              className="rounded-full relative"
              asChild
            >
              <Link
                href={`/mesa/${
                  typeof token === "string" ? token : ""
                }/carrinho`}
              >
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
            value={categoriaAtiva === 0 ? "todos" : categoriaAtiva.toString()}
            onValueChange={(val) =>
              setCategoriaAtiva(val === "todos" ? 0 : Number(val))
            }
          >
            <TabsList className="w-full overflow-x-auto flex justify-start p-1 h-auto">
              <TabsTrigger value="todos" className="px-3 py-1.5">
                Todos
              </TabsTrigger>
              {categorias.map((categoria) => (
                <TabsTrigger
                  key={categoria.id}
                  value={categoria.id.toString()}
                  className="px-3 py-1.5"
                >
                  {categoria.nome}
                </TabsTrigger>
              ))}
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
            onClick={() => setModalFiltrosAberto(true)}
          >
            <Filter className="h-4 w-4" />
            Filtros
            {filtrosAtivos && (
              <Badge className="ml-1 h-5 w-5 flex items-center justify-center p-0">
                {quantidadeFiltros}
              </Badge>
            )}
          </Button>
        </div>

        {/* Lista de produtos */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Carregando produtos...</p>
          </div>
        ) : produtos.length === 0 ? (
          <div className="text-center py-12">
            <h3 className="text-xl font-medium mb-2">
              Nenhum produto encontrado
            </h3>
            <p className="text-muted-foreground mb-4">
              Tente mudar os filtros ou selecionar outra categoria.
            </p>
            <Button variant="outline" onClick={limparFiltros}>
              Limpar filtros
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {produtos.map((produto) => (
              <ProdutoCard
                key={produto.id}
                produto={produto}
                onSelect={abrirModalProduto}
              />
            ))}
          </div>
        )}
      </main>

      {/* Modals */}
      <ModalFiltros
        isOpen={modalFiltrosAberto}
        onClose={() => setModalFiltrosAberto(false)}
        filtroVegetariano={filtroVegetariano}
        filtroSemGluten={filtroSemGluten}
        onAplicarFiltros={aplicarFiltros}
      />

      <ModalProduto
        produto={produtoSelecionado}
        isOpen={modalProdutoAberto}
        onClose={fecharModalProduto}
        onAddToCart={adicionarAoCarrinho}
      />

      {/* Botão flutuante do carrinho */}
      {carrinho.length > 0 && (
        <div className="fixed bottom-4 right-4 left-4 z-10">
          <Button
            className="w-full shadow-lg gap-2 justify-between py-6"
            asChild
          >
            <Link
              href={`/mesa/${typeof token === "string" ? token : ""}/carrinho`}
            >
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
