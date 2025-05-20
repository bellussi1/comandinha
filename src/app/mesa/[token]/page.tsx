"use client";

import { ThemeToggle } from "@/src/components/theme-toggle";
import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import { Card, CardContent } from "@/src/components/ui/card";
import { Checkbox } from "@/src/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger } from "@/src/components/ui/tabs";
import { Toaster } from "@/src/components/ui/toaster";
import { useToast } from "@/src/components/ui/use-toast";
import { adicionarItem, getCarrinho } from "@/src/services/carrinho";
import { ativarMesa, validarToken } from "@/src/services/mesa";
import {
  filtrarProdutos,
  getProdutosPorCategoria,
  getProdutosRecomendados,
} from "@/src/services/produtos";
import type { ItemCarrinho, Produto } from "@/src/types";
import {
  ChevronRight,
  Clock,
  Filter,
  Loader2,
  Minus,
  Plus,
  Receipt,
  ShoppingCart,
  Star,
  X,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function MenuPage() {
  const params = useParams();
  const router = useRouter();
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
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [loading, setLoading] = useState(true);
  const [isValidMesa, setIsValidMesa] = useState(false);

  // Verificar token da mesa
  useEffect(() => {
    async function verificarMesa() {
      if (typeof token === "string" && token !== "demo") {
        try {
          console.log("Verificando mesa:", token);

          // Forçar ativação da mesa para obter token válido
          try {
            const ativacaoResponse = await ativarMesa(token);
            console.log("Mesa ativada:", ativacaoResponse);
            setIsValidMesa(true);
          } catch (ativacaoError) {
            console.log("Falha na ativação, tentando validação simples");

            // Se ativação falhar, tentar validação simples
            const isValid = await validarToken(token);
            console.log("Resultado validação:", isValid);
            setIsValidMesa(isValid);

            if (!isValid) {
              toast({
                title: "Mesa inválida",
                description: "Esta mesa não está disponível",
                variant: "destructive",
              });
              setTimeout(() => router.push("/"), 3000);
            }
          }
        } catch (error) {
          console.error("Erro ao verificar mesa:", error);
          setIsValidMesa(false);
          toast({
            title: "Erro",
            description: "Não foi possível verificar esta mesa",
            variant: "destructive",
          });
        }
      } else if (token === "demo") {
        setIsValidMesa(true);
      }
    }
    verificarMesa();
  }, [token, toast, router]);

  // Carregar carrinho do localStorage
  useEffect(() => {
    if (typeof token === "string") {
      const carrinhoSalvo = getCarrinho(token);
      setCarrinho(carrinhoSalvo);
    }
  }, [token]);

  // Buscar produtos pela API
  useEffect(() => {
    async function fetchProdutos() {
      try {
        setLoading(true);
        let produtosBuscados: Produto[];

        if (categoriaAtiva === "todos") {
          // Se for "todos", buscar recomendados ou todos os produtos
          produtosBuscados = await getProdutosRecomendados(20);
        } else {
          // Buscar produtos por categoria específica
          produtosBuscados = await getProdutosPorCategoria(
            categoriaAtiva as any
          );
        }

        // Aplicar filtros de vegetariano e sem gluten no cliente
        if (filtroVegetariano || filtroSemGluten) {
          produtosBuscados = await filtrarProdutos({
            categoria: categoriaAtiva as any,
            vegetariano: filtroVegetariano,
            semGluten: filtroSemGluten,
          });
        }

        setProdutos(produtosBuscados);
      } catch (error) {
        console.error("Erro ao buscar produtos:", error);
        toast({
          title: "Erro ao carregar produtos",
          description:
            "Não foi possível carregar os produtos. Tente novamente.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    }

    fetchProdutos();
  }, [categoriaAtiva, filtroVegetariano, filtroSemGluten, toast]);

  // Funções auxiliares
  const abrirModalProduto = (produto: Produto) => {
    setProdutoSelecionado(produto);
    setQuantidade(1);
    setObservacoes("");
    setModalProdutoAberto(true);
  };

  const fecharModalProduto = () => {
    setModalProdutoAberto(false);
    setTimeout(() => {
      setProdutoSelecionado(null);
    }, 300);
  };

  const incrementarQuantidade = () => {
    setQuantidade((prev) => prev + 1);
  };

  const decrementarQuantidade = () => {
    if (quantidade > 1) {
      setQuantidade((prev) => prev - 1);
    }
  };

  const adicionarAoCarrinho = () => {
    if (!produtoSelecionado || typeof token !== "string") return;

    const item: ItemCarrinho = {
      ...produtoSelecionado,
      quantidade,
      observacoes: observacoes.trim() || undefined,
    };

    adicionarItem(token, item);

    // Atualizar estado local
    setCarrinho(getCarrinho(token));

    // Feedback e fechamento
    toast({
      title: "Item adicionado",
      description: `${quantidade}x ${produtoSelecionado.nome} adicionado ao pedido`,
    });

    fecharModalProduto();
  };

  // Calcula o total de itens no carrinho
  const totalItensCarrinho = carrinho.reduce(
    (total, item) => total + item.quantidade,
    0
  );

  // Calcula o valor total do carrinho
  const totalCarrinho = carrinho.reduce(
    (total, item) => total + item.preco * item.quantidade,
    0
  );

  // Filtrar produtos por busca (se implementarmos depois)
  const produtosFiltrados = produtos;

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background border-b">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h1 className="font-bold text-lg">
              Mesa {typeof token === "string" ? token : ""}
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
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Carregando produtos...</p>
          </div>
        ) : produtosFiltrados.length === 0 ? (
          <div className="text-center py-12">
            <h3 className="text-xl font-medium mb-2">
              Nenhum produto encontrado
            </h3>
            <p className="text-muted-foreground mb-4">
              Tente mudar os filtros ou selecionar outra categoria.
            </p>
            <Button
              variant="outline"
              onClick={() => {
                setFiltroVegetariano(false);
                setFiltroSemGluten(false);
                setCategoriaAtiva("todos");
              }}
            >
              Limpar filtros
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {produtosFiltrados.map((produto) => (
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
        )}
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
                <X className="h-5 w-5" />
                <span className="sr-only">Fechar</span>
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
