"use client";

import { Button } from "@/src/components/ui/button";
import { Card, CardContent } from "@/src/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/src/components/ui/sheet";
import { Toaster } from "@/src/components/ui/toaster";
import { useToast } from "@/src/components/ui/use-toast";
import {
  atualizarQuantidade,
  getCarrinho,
  limparCarrinho,
  removerItem,
} from "@/src/services/carrinho";
import { adicionarPedido } from "@/src/services/pedidos";
import type { ItemCarrinho } from "@/src/types";
import {
  ArrowLeft,
  CheckCircle2,
  Minus,
  Plus,
  Receipt,
  Trash2,
  Users,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function CarrinhoPage() {
  const params = useParams();
  const router = useRouter();
  const { token } = params;
  const { toast } = useToast();

  const [carrinho, setCarrinho] = useState<ItemCarrinho[]>([]);
  const [observacoesGerais, setObservacoesGerais] = useState("");
  const [confirmacaoAberta, setConfirmacaoAberta] = useState(false);

  // Carregar carrinho
  useEffect(() => {
    if (typeof token === "string") {
      const carrinhoSalvo = getCarrinho(token);
      setCarrinho(carrinhoSalvo);
    }
  }, [token]);

  const totalCarrinho = carrinho.reduce((total, item) => {
    return total + item.preco * item.quantidade;
  }, 0);

  const incrementarQuantidade = (id: string) => {
    const item = carrinho.find((i) => i.id === id);
    if (item && typeof token === "string") {
      atualizarQuantidade(token, id, item.quantidade + 1);
      setCarrinho(getCarrinho(token));
    }
  };

  const decrementarQuantidade = (id: string) => {
    const item = carrinho.find((i) => i.id === id);
    if (item && item.quantidade > 1 && typeof token === "string") {
      atualizarQuantidade(token, id, item.quantidade - 1);
      setCarrinho(getCarrinho(token));
    }
  };

  const removerItemDoCarrinho = (id: string) => {
    if (typeof token === "string") {
      removerItem(token, id);
      setCarrinho(getCarrinho(token));
      toast({
        title: "Item removido",
        description: "O item foi removido do seu pedido",
        duration: 3000,
      });
    }
  };

  const enviarPedido = () => {
    if (carrinho.length === 0 || typeof token !== "string") return;

    const novoPedido = adicionarPedido({
      mesa: token,
      itens: [...carrinho],
    });

    limparCarrinho(token);
    setCarrinho([]);
    setObservacoesGerais("");
    setConfirmacaoAberta(false);

    toast({
      title: "Pedido enviado com sucesso!",
      description: "Seu pedido foi recebido e está sendo preparado",
      duration: 5000,
    });

    setTimeout(() => {
      router.push(`/mesa/${token}/pedidos`);
    }, 1500);
  };

  const formatarData = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background border-b">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" asChild>
              <Link href={`/mesa/${token}`}>
                <ArrowLeft className="h-5 w-5" />
                <span className="sr-only">Voltar</span>
              </Link>
            </Button>
            <h1 className="font-bold text-lg">Seu pedido</h1>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" className="gap-1" asChild>
              <Link href={`/mesa/${token}/pedidos`}>
                <Receipt className="h-4 w-4" />
                <span>Pedidos</span>
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Conteúdo principal */}
      <main className="flex-1 container mx-auto px-4 py-6">
        {carrinho.length > 0 ? (
          <>
            <h2 className="text-xl font-bold mb-4">Itens no carrinho</h2>

            <div className="space-y-4 mb-6">
              {carrinho.map((item) => (
                <Card key={item.id} className="overflow-hidden">
                  <div className="flex">
                    <div className="relative h-24 w-24 flex-shrink-0">
                      <Image
                        src={item.imagem || "/placeholder.svg"}
                        alt={item.nome}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <CardContent className="p-3 flex-1">
                      <div className="flex justify-between items-start">
                        <h3 className="font-medium">{item.nome}</h3>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => removerItemDoCarrinho(item.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                          <span className="sr-only">Remover</span>
                        </Button>
                      </div>

                      {item.observacoes && (
                        <p className="text-xs text-muted-foreground mt-1 mb-2">
                          Obs: {item.observacoes}
                        </p>
                      )}

                      <div className="flex justify-between items-center mt-2">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => decrementarQuantidade(item.id)}
                            disabled={item.quantidade <= 1}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="w-6 text-center">
                            {item.quantidade}
                          </span>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => incrementarQuantidade(item.id)}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                        <span className="font-medium">
                          R${" "}
                          {(item.preco * item.quantidade)
                            .toFixed(2)
                            .replace(".", ",")}
                        </span>
                      </div>
                    </CardContent>
                  </div>
                </Card>
              ))}
            </div>

            <Card className="mb-6">
              <CardContent className="p-4">
                <h3 className="font-medium mb-2">Observações gerais</h3>
                <textarea
                  className="w-full p-3 border rounded-md h-24 bg-background"
                  placeholder="Alguma observação para todo o pedido?"
                  value={observacoesGerais}
                  onChange={(e) => setObservacoesGerais(e.target.value)}
                />
              </CardContent>
            </Card>

            <Card className="mb-6">
              <CardContent className="p-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>R$ {totalCarrinho.toFixed(2).replace(".", ",")}</span>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-muted-foreground">
                    Taxa de serviço (10%)
                  </span>
                  <span>
                    R$ {(totalCarrinho * 0.1).toFixed(2).replace(".", ",")}
                  </span>
                </div>
                <div className="border-t my-2 pt-2 flex justify-between items-center font-bold">
                  <span>Total</span>
                  <span className="text-primary text-lg">
                    R$ {(totalCarrinho * 1.1).toFixed(2).replace(".", ",")}
                  </span>
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-3">
              <Button variant="outline" className="flex-1 gap-1" asChild>
                <Link href={`/mesa/${token}/dividir-conta`}>
                  <Users className="h-4 w-4" />
                  <span>Dividir conta</span>
                </Link>
              </Button>
              <Button
                className="flex-1"
                onClick={() => setConfirmacaoAberta(true)}
              >
                Confirmar pedido
              </Button>
            </div>
          </>
        ) : (
          <div className="text-center py-12">
            <div className="mx-auto w-16 h-16 mb-4 text-muted-foreground">
              <Receipt className="w-16 h-16" />
            </div>
            <h2 className="text-xl font-bold mb-2">Seu carrinho está vazio</h2>
            <p className="text-muted-foreground mb-6">
              Adicione itens do cardápio para fazer seu pedido
            </p>
            <Button asChild>
              <Link href={`/mesa/${token}`}>Ver cardápio</Link>
            </Button>
          </div>
        )}
      </main>

      {/* Modal de confirmação */}
      <Sheet open={confirmacaoAberta} onOpenChange={setConfirmacaoAberta}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Confirmar pedido</SheetTitle>
            <SheetDescription>
              Revise seu pedido antes de confirmar
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-4">
            {carrinho.map((item) => (
              <div key={item.id} className="flex justify-between items-center">
                <div>
                  <span className="font-medium">{item.quantidade}x </span>
                  <span>{item.nome}</span>
                </div>
                <span>
                  R${" "}
                  {(item.preco * item.quantidade).toFixed(2).replace(".", ",")}
                </span>
              </div>
            ))}

            <div className="border-t pt-4 mt-4">
              <div className="flex justify-between items-center mb-1">
                <span className="text-muted-foreground">Subtotal</span>
                <span>R$ {totalCarrinho.toFixed(2).replace(".", ",")}</span>
              </div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-muted-foreground">
                  Taxa de serviço (10%)
                </span>
                <span>
                  R$ {(totalCarrinho * 0.1).toFixed(2).replace(".", ",")}
                </span>
              </div>
              <div className="flex justify-between items-center font-bold mt-2">
                <span>Total</span>
                <span className="text-primary">
                  R$ {(totalCarrinho * 1.1).toFixed(2).replace(".", ",")}
                </span>
              </div>
            </div>

            {observacoesGerais && (
              <div className="border-t pt-4 mt-4">
                <h4 className="font-medium mb-1">Observações:</h4>
                <p className="text-sm text-muted-foreground">
                  {observacoesGerais}
                </p>
              </div>
            )}

            <div className="border-t pt-4 mt-4">
              <Button className="w-full gap-2" onClick={enviarPedido}>
                <CheckCircle2 className="h-4 w-4" />
                Confirmar e enviar pedido
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <Toaster />
    </div>
  );
}
