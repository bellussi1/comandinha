// src/app/mesa/[token]/dividir-conta/page.tsx
"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Users,
  UserPlus,
  UserMinus,
  Check,
  Divide,
  Loader2,
  Share2,
} from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { Card, CardContent } from "@/src/components/ui/card";
import { useToast } from "@/src/components/ui/use-toast";
import { Toaster } from "@/src/components/ui/toaster";
import { getCarrinho } from "@/src/services/carrinho";
import type { ItemCarrinho, ItemDivisao } from "@/src/types";
import {
  calcularDivisaoConta,
  verificarItensSemDivisao,
} from "@/src/utils/calculadores";

export default function DividirContaPage() {
  const params = useParams();
  const router = useRouter();
  const { token } = params as { token: string };
  const { toast } = useToast();

  const [carrinho, setCarrinho] = useState<ItemCarrinho[]>([]);
  const [itensDivisao, setItensDivisao] = useState<ItemDivisao[]>([]);
  const [numPessoas, setNumPessoas] = useState(2);
  const [divisaoIgualitaria, setDivisaoIgualitaria] = useState(false);
  const [processando, setProcessando] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [modoApresentacao, setModoApresentacao] = useState(false);

  // Carregar carrinho do localStorage
  useEffect(() => {
    try {
      const carrinhoSalvo = getCarrinho(token);
      setCarrinho(carrinhoSalvo);

      // Inicializar itens de divisão
      const divisao = carrinhoSalvo.map((item: ItemCarrinho) => ({
        ...item,
        pessoas: divisaoIgualitaria
          ? Array.from({ length: numPessoas }, (_, i) => i)
          : [0],
      }));

      setItensDivisao(divisao);
    } catch (error) {
      console.error("Erro ao carregar carrinho:", error);
      toast({
        title: "Erro ao carregar itens",
        description: "Não foi possível carregar os itens para divisão.",
        variant: "destructive",
      });
    } finally {
      setCarregando(false);
    }
  }, [token, toast, divisaoIgualitaria, numPessoas]);

  // Atualizar divisão quando o número de pessoas muda
  useEffect(() => {
    if (divisaoIgualitaria) {
      setItensDivisao((prev) =>
        prev.map((item) => ({
          ...item,
          pessoas: Array.from({ length: numPessoas }, (_, i) => i),
        }))
      );
    }
  }, [numPessoas, divisaoIgualitaria]);

  // Toggle divisão igualitária
  const toggleDivisaoIgualitaria = () => {
    const novoValor = !divisaoIgualitaria;
    setDivisaoIgualitaria(novoValor);

    // Atualizar as pessoas em cada item conforme a divisão escolhida
    setItensDivisao((prev) =>
      prev.map((item) => ({
        ...item,
        pessoas: novoValor
          ? Array.from({ length: numPessoas }, (_, i) => i) // Todos pagam
          : item.pessoas.length === 0
          ? [0]
          : item.pessoas, // Manter seleções ou padrão para pessoa 1
      }))
    );
  };

  // Toggle pessoa em um item específico
  const togglePessoaItem = (itemId: string, pessoaIndex: number) => {
    setItensDivisao((prev) =>
      prev.map((item) => {
        if (item.id !== itemId) return item;

        // Verificar se a pessoa já está na lista
        const pessoaPresente = item.pessoas.includes(pessoaIndex);
        let novasPessoas: number[];

        if (pessoaPresente) {
          // Não permitir remover a última pessoa
          if (item.pessoas.length <= 1) return item;
          // Remover pessoa
          novasPessoas = item.pessoas.filter((p) => p !== pessoaIndex);
        } else {
          // Adicionar pessoa
          novasPessoas = [...item.pessoas, pessoaIndex];
        }

        return {
          ...item,
          pessoas: novasPessoas,
        };
      })
    );
  };

  // Calcular totais por pessoa e taxas
  const { totaisPorPessoa, totalConta, taxaServico, taxaServicoIndividual } =
    useMemo(
      () => calcularDivisaoConta(itensDivisao, numPessoas, 0.1),
      [itensDivisao, numPessoas]
    );

  const incrementarPessoas = () => {
    if (numPessoas < 10) {
      setNumPessoas((prev) => prev + 1);
    }
  };

  const decrementarPessoas = () => {
    if (numPessoas > 2) {
      // Remover a pessoa das seleções
      setItensDivisao((prev) =>
        prev.map((item) => ({
          ...item,
          pessoas: item.pessoas.filter((p) => p < numPessoas - 1),
        }))
      );

      setNumPessoas((prev) => prev - 1);
    }
  };

  // Função refatorada para apenas exibir o modo de apresentação
  const concluirDivisao = () => {
    setProcessando(true);

    // Simulação de processamento para melhor experiência de usuário
    setTimeout(() => {
      setProcessando(false);
      setModoApresentacao(true);

      toast({
        title: "Divisão calculada com sucesso!",
        description: "Mostre esta tela ao garçom para finalizar o pagamento.",
        duration: 5000,
      });
    }, 800);
  };

  // Sair do modo apresentação
  const sairModoApresentacao = () => {
    setModoApresentacao(false);
  };

  // Verificar se algum item não tem pessoa atribuída
  const temItemSemDivisao = useMemo(
    () => verificarItensSemDivisao(itensDivisao),
    [itensDivisao]
  );

  return (
    <div className="min-h-screen flex flex-col">
      {!modoApresentacao ? (
        <>
          {/* Header */}
          <header className="sticky top-0 z-10 bg-background border-b">
            <div className="container mx-auto px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" asChild>
                  <Link href={`/mesa/${token}/carrinho`}>
                    <ArrowLeft className="h-5 w-5" />
                    <span className="sr-only">Voltar</span>
                  </Link>
                </Button>
                <h1 className="font-bold text-lg">Dividir conta</h1>
              </div>
            </div>
          </header>

          {/* Conteúdo principal */}
          <main className="flex-1 container mx-auto px-4 py-6">
            {carregando ? (
              <div className="flex flex-col items-center justify-center h-64">
                <Loader2 className="h-10 w-10 animate-spin mb-4 text-primary" />
                <p>Carregando itens...</p>
              </div>
            ) : carrinho.length === 0 ? (
              <div className="text-center py-12">
                <h2 className="text-xl font-bold mb-2">Carrinho vazio</h2>
                <p className="text-muted-foreground mb-6">
                  Adicione itens ao carrinho para dividi-los
                </p>
                <Button asChild>
                  <Link href={`/mesa/${token}`}>Ver cardápio</Link>
                </Button>
              </div>
            ) : (
              <>
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-medium">Número de pessoas</h2>
                    <div className="flex items-center gap-3">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={decrementarPessoas}
                        disabled={numPessoas <= 2}
                      >
                        <UserMinus className="h-4 w-4" />
                      </Button>
                      <div className="flex items-center gap-1 min-w-[40px] justify-center">
                        <Users className="h-4 w-4" />
                        <span>{numPessoas}</span>
                      </div>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={incrementarPessoas}
                        disabled={numPessoas >= 10}
                      >
                        <UserPlus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <Button
                    variant={divisaoIgualitaria ? "default" : "outline"}
                    className="w-full gap-2"
                    onClick={toggleDivisaoIgualitaria}
                  >
                    <Divide className="h-4 w-4" />
                    {divisaoIgualitaria
                      ? "Divisão igualitária ativada"
                      : "Dividir igualmente"}
                  </Button>
                </div>

                {!divisaoIgualitaria && (
                  <div className="mb-6">
                    <h2 className="text-lg font-medium mb-3">
                      Selecione quem vai pagar cada item
                    </h2>
                    <p className="text-sm text-muted-foreground mb-4">
                      Toque nos números para selecionar quem pagará cada item
                    </p>
                  </div>
                )}

                <div className="space-y-4 mb-8">
                  {itensDivisao.map((item) => (
                    <Card key={item.id}>
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h3 className="font-medium">
                              {item.quantidade}x {item.nome}
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              R${" "}
                              {(item.preco * item.quantidade)
                                .toFixed(2)
                                .replace(".", ",")}
                            </p>
                          </div>
                        </div>

                        {!divisaoIgualitaria && (
                          <div className="flex flex-wrap gap-2 mt-3">
                            {Array.from({ length: numPessoas }, (_, i) => (
                              <Button
                                key={i}
                                variant={
                                  item.pessoas.includes(i)
                                    ? "default"
                                    : "outline"
                                }
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={() => togglePessoaItem(item.id, i)}
                              >
                                {i + 1}
                              </Button>
                            ))}
                          </div>
                        )}

                        {divisaoIgualitaria && (
                          <div className="text-sm text-muted-foreground mt-2">
                            Dividido igualmente entre todos
                          </div>
                        )}

                        {item.pessoas.length > 0 && (
                          <div className="text-sm mt-2">
                            <span className="text-muted-foreground">
                              Valor por pessoa:{" "}
                            </span>
                            <span className="font-medium">
                              R${" "}
                              {(
                                (item.preco * item.quantidade) /
                                item.pessoas.length
                              )
                                .toFixed(2)
                                .replace(".", ",")}
                            </span>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <Card className="mb-6">
                  <CardContent className="p-4">
                    <h3 className="font-medium mb-3">Resumo da divisão</h3>

                    {Array.from({ length: numPessoas }, (_, i) => (
                      <div
                        key={i}
                        className="flex justify-between items-center mb-2"
                      >
                        <span>Pessoa {i + 1}</span>
                        <div className="text-right">
                          <div>
                            R$ {totaisPorPessoa[i].toFixed(2).replace(".", ",")}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            + taxa: R${" "}
                            {taxaServicoIndividual.toFixed(2).replace(".", ",")}
                          </div>
                        </div>
                      </div>
                    ))}

                    <div className="border-t my-3 pt-3">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-muted-foreground">Subtotal</span>
                        <span>
                          R$ {totalConta.toFixed(2).replace(".", ",")}
                        </span>
                      </div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-muted-foreground">
                          Taxa de serviço (10%)
                        </span>
                        <span>
                          R$ {taxaServico.toFixed(2).replace(".", ",")}
                        </span>
                      </div>
                      <div className="flex justify-between items-center font-bold mt-2">
                        <span>Total</span>
                        <span className="text-primary">
                          R${" "}
                          {(totalConta + taxaServico)
                            .toFixed(2)
                            .replace(".", ",")}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Button
                  className="w-full gap-2"
                  onClick={concluirDivisao}
                  disabled={processando || temItemSemDivisao}
                >
                  {processando ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Processando...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4" />
                      Calcular divisão
                    </>
                  )}
                </Button>

                {temItemSemDivisao && (
                  <p className="text-destructive text-sm text-center mt-2">
                    Há itens sem pessoa atribuída. Atribua todos os itens para
                    continuar.
                  </p>
                )}
              </>
            )}
          </main>
        </>
      ) : (
        // Modo de apresentação para o garçom
        <div className="min-h-screen bg-background p-6">
          <div className="max-w-md mx-auto">
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-2xl font-bold">Resumo da Divisão</h1>
              <Button
                variant="outline"
                size="sm"
                onClick={sairModoApresentacao}
              >
                Voltar
              </Button>
            </div>

            <Card className="mb-6">
              <CardContent className="p-4">
                <h2 className="text-xl font-medium text-center mb-4">
                  Mesa {token}
                </h2>

                <div className="space-y-4">
                  {Array.from({ length: numPessoas }, (_, i) => (
                    <div key={i} className="p-3 border rounded-md bg-muted/20">
                      <h3 className="text-lg font-bold mb-1">Pessoa {i + 1}</h3>
                      <div className="flex justify-between text-lg">
                        <span>Consumo:</span>
                        <span>
                          R$ {totaisPorPessoa[i].toFixed(2).replace(".", ",")}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>Taxa de serviço (10%):</span>
                        <span>
                          R${" "}
                          {taxaServicoIndividual.toFixed(2).replace(".", ",")}
                        </span>
                      </div>
                      <div className="flex justify-between font-bold text-lg mt-2 pt-2 border-t">
                        <span>Total a pagar:</span>
                        <span className="text-primary">
                          R${" "}
                          {(totaisPorPessoa[i] + taxaServicoIndividual)
                            .toFixed(2)
                            .replace(".", ",")}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 pt-4 border-t">
                  <div className="flex justify-between font-bold text-lg">
                    <span>Total geral:</span>
                    <span>
                      R${" "}
                      {(totalConta + taxaServico).toFixed(2).replace(".", ",")}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-2">
              <Button
                className="flex-1"
                variant="outline"
                onClick={sairModoApresentacao}
              >
                Voltar para edição
              </Button>
              <Button className="flex-1" asChild>
                <Link href={`/mesa/${token}/carrinho`}>Ir para carrinho</Link>
              </Button>
            </div>
          </div>
        </div>
      )}

      <Toaster />
    </div>
  );
}
