"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Users,
  UserPlus,
  UserMinus,
  Check,
  Divide,
} from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { Card, CardContent } from "@/src/components/ui/card";
import { useToast } from "@/src/components/ui/use-toast";
import { Toaster } from "@/src/components/ui/toaster";
import { getCarrinho } from "@/src/services/carrinho";
import type { ItemCarrinho, ItemDivisao } from "@/src/types";

export default function DividirContaPage() {
  const params = useParams();
  const router = useRouter();
  const { token } = params as { token: string };
  const { toast } = useToast();

  const [carrinho, setCarrinho] = useState<ItemCarrinho[]>([]);
  const [itensDivisao, setItensDivisao] = useState<ItemDivisao[]>([]);
  const [numPessoas, setNumPessoas] = useState(2);
  const [divisaoIgualitaria, setDivisaoIgualitaria] = useState(false);

  // Carregar carrinho do localStorage
  useEffect(() => {
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
  }, [token, divisaoIgualitaria, numPessoas]);

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

  const togglePessoaItem = (itemId: string, pessoaIndex: number) => {
    if (divisaoIgualitaria) return;

    setItensDivisao((prev) =>
      prev.map((item) => {
        if (item.id === itemId) {
          const pessoas = [...item.pessoas];
          const index = pessoas.indexOf(pessoaIndex);

          if (index > -1) {
            pessoas.splice(index, 1);
          } else {
            pessoas.push(pessoaIndex);
          }

          return { ...item, pessoas };
        }
        return item;
      })
    );
  };

  const toggleDivisaoIgualitaria = () => {
    const novoEstado = !divisaoIgualitaria;
    setDivisaoIgualitaria(novoEstado);

    if (novoEstado) {
      // Dividir tudo igualmente
      setItensDivisao((prev) =>
        prev.map((item) => ({
          ...item,
          pessoas: Array.from({ length: numPessoas }, (_, i) => i),
        }))
      );
    }
  };

  const calcularTotalPorPessoa = () => {
    const totais = Array(numPessoas).fill(0);

    itensDivisao.forEach((item) => {
      const valorPorPessoa =
        item.pessoas.length > 0
          ? (item.preco * item.quantidade) / item.pessoas.length
          : 0;

      item.pessoas.forEach((pessoaIndex) => {
        totais[pessoaIndex] += valorPorPessoa;
      });
    });

    return totais;
  };

  const totalCarrinho = carrinho.reduce((total, item) => {
    return total + item.preco * item.quantidade;
  }, 0);

  const totaisPorPessoa = calcularTotalPorPessoa();
  const totalDividido = totaisPorPessoa.reduce((a, b) => a + b, 0);
  const taxaServico = totalCarrinho * 0.1;
  const taxaServicoIndividual = taxaServico / numPessoas;

  const concluirDivisao = () => {
    toast({
      title: "Divisão concluída",
      description: "Mostre ao garçom para finalizar o pagamento",
      duration: 5000,
    });
  };

  return (
    <div className="min-h-screen flex flex-col">
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
                          item.pessoas.includes(i) ? "default" : "outline"
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
                      {((item.preco * item.quantidade) / item.pessoas.length)
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
              <div key={i} className="flex justify-between items-center mb-2">
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
                <span>R$ {totalDividido.toFixed(2).replace(".", ",")}</span>
              </div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-muted-foreground">
                  Taxa de serviço (10%)
                </span>
                <span>R$ {taxaServico.toFixed(2).replace(".", ",")}</span>
              </div>
              <div className="flex justify-between items-center font-bold mt-2">
                <span>Total</span>
                <span className="text-primary">
                  R${" "}
                  {(totalDividido + taxaServico).toFixed(2).replace(".", ",")}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Button className="w-full gap-2" onClick={concluirDivisao}>
          <Check className="h-4 w-4" />
          Concluir divisão
        </Button>
      </main>

      <Toaster />
    </div>
  );
}
