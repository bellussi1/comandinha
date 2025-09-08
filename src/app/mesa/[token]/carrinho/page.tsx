// src/app/mesa/[token]/carrinho/page.tsx
"use client";

import { Button } from "@/src/components/ui/button";
import { Card, CardContent } from "@/src/components/ui/card";
import { Textarea } from "@/src/components/ui/textarea";
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
import { getMesaPorUuid, Mesa } from "@/src/services/mesa";
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
  Loader2,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { calcularTotalItems } from "@/src/utils/calculadores";

export default function CarrinhoPage() {
  const params = useParams();
  const router = useRouter();
  const { token } = params as { token: string };
  const { toast } = useToast();

  const [mesa, setMesa] = useState<Mesa | null>(null);
  const [carrinho, setCarrinho] = useState<ItemCarrinho[]>([]);
  const [observacoesGerais, setObservacoesGerais] = useState("");
  const [confirmacaoAberta, setConfirmacaoAberta] = useState(false);
  const [enviandoPedido, setEnviandoPedido] = useState(false);

  // Carregar dados da mesa
  useEffect(() => {
    const carregarMesa = async () => {
      try {
        const dadosMesa = await getMesaPorUuid(token);
        setMesa(dadosMesa);
      } catch (error) {
        console.error("Erro ao carregar dados da mesa:", error);
      }
    };
    carregarMesa();
  }, [token]);

  // Carregar carrinho
  useEffect(() => {
    const carrinhoSalvo = getCarrinho(token);
    setCarrinho(carrinhoSalvo);
  }, [token]);

  const totalCarrinho = calcularTotalItems(carrinho);

  const incrementarQuantidade = (id: string) => {
    const item = carrinho.find((i) => i.id === id);
    if (item) {
      atualizarQuantidade(token, id, item.quantidade + 1);
      setCarrinho(getCarrinho(token));
    }
  };

  const decrementarQuantidade = (id: string) => {
    const item = carrinho.find((i) => i.id === id);
    if (item && item.quantidade > 1) {
      atualizarQuantidade(token, id, item.quantidade - 1);
      setCarrinho(getCarrinho(token));
    }
  };

  const removerItemDoCarrinho = (id: string) => {
    removerItem(token, id);
    setCarrinho(getCarrinho(token));
    toast({
      title: "Item removido",
      description: "O item foi removido do seu pedido",
      duration: 3000,
    });
  };

  const enviarPedido = async () => {
    if (carrinho.length === 0 || !mesa) return;

    try {
      setEnviandoPedido(true);

      // Transformar carrinho para formato esperado pela API
      const novoPedido = await adicionarPedido({
        mesa: mesa.id.toString(), // Usar o ID numérico da mesa
        itens: [...carrinho],
        observacoesGerais: observacoesGerais || undefined,
      });

      // Limpar o carrinho após enviar o pedido
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
    } catch (error) {
      console.error("Erro ao enviar pedido:", error);
      toast({
        title: "Erro ao enviar pedido",
        description: "Não foi possível realizar seu pedido. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setEnviandoPedido(false);
    }
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
        </div>
      </header>

      {/* Conteúdo principal */}
      <main className="flex-1 container mx-auto px-4 py-6">
        {carrinho.length === 0 ? (
          <div className="text-center py-12">
            <div className="mx-auto w-16 h-16 mb-4 text-muted-foreground">
              <Receipt className="w-16 h-16" />
            </div>
            <h2 className="text-xl font-bold mb-2">Carrinho vazio</h2>
            <p className="text-muted-foreground mb-6">
              Adicione itens ao seu pedido para continuar
            </p>
            <Button asChild>
              <Link href={`/mesa/${token}`}>Ver cardápio</Link>
            </Button>
          </div>
        ) : (
          <>
            <div className="space-y-4 mb-8">
              {carrinho.map((item) => (
                <Card key={item.id} className="overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex gap-4">
                      <div className="relative h-20 w-20 flex-shrink-0">
                        <Image
                          src={(item.imagem?.trimEnd()) || "/placeholder.svg"}
                          alt={item.nome}
                          fill
                          className="object-cover rounded-md"
                        />
                      </div>

                      <div className="flex-1">
                        <div className="flex justify-between items-start">
                          <h3 className="font-medium">{item.nome}</h3>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => removerItemDoCarrinho(item.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Remover</span>
                          </Button>
                        </div>

                        {item.observacoes && (
                          <p className="text-sm text-muted-foreground mb-1">
                            {item.observacoes}
                          </p>
                        )}

                        <div className="flex justify-between items-center mt-2">
                          <div className="flex items-center border rounded-md">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => decrementarQuantidade(item.id)}
                              disabled={item.quantidade <= 1}
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="w-8 text-center">
                              {item.quantidade}
                            </span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => incrementarQuantidade(item.id)}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>

                          <div className="font-medium">
                            R${" "}
                            {(item.preco * item.quantidade)
                              .toFixed(2)
                              .replace(".", ",")}
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="mb-6">
              <h3 className="font-medium mb-2">Observações gerais</h3>
              <Textarea
                placeholder="Alguma observação para o pedido todo? Ex: Mesa longe do banheiro..."
                value={observacoesGerais}
                onChange={(e) => setObservacoesGerais(e.target.value)}
                rows={3}
              />
            </div>

            <div className="border-t pt-4">
              <div className="flex justify-between items-center font-medium text-lg mb-6">
                <span>Total</span>
                <span>R$ {totalCarrinho.toFixed(2).replace(".", ",")}</span>
              </div>

              <Button
                className="w-full"
                size="lg"
                onClick={() => setConfirmacaoAberta(true)}
                disabled={enviandoPedido}
              >
                {enviandoPedido ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processando...
                  </>
                ) : (
                  <>Fazer pedido</>
                )}
              </Button>
            </div>
          </>
        )}
      </main>

      {/* Modal de confirmação */}
      <Sheet open={confirmacaoAberta} onOpenChange={setConfirmacaoAberta}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Confirmar pedido</SheetTitle>
            <SheetDescription>
              Confira os itens do seu pedido antes de confirmar
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-4 my-6">
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

            <div className="border-t pt-4 flex justify-between items-center font-medium">
              <span>Total</span>
              <span>R$ {totalCarrinho.toFixed(2).replace(".", ",")}</span>
            </div>
          </div>

          <div className="flex space-x-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setConfirmacaoAberta(false)}
              disabled={enviandoPedido}
            >
              Cancelar
            </Button>
            <Button
              className="flex-1"
              onClick={enviarPedido}
              disabled={enviandoPedido}
            >
              {enviandoPedido ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Confirmar pedido
                </>
              )}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <Toaster />
    </div>
  );
}
