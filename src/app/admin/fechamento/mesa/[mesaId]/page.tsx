"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { AuthGuard } from "@/src/components/auth/AuthGuard";
import { Button } from "@/src/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/src/components/ui/card";
import { Badge } from "@/src/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/src/components/ui/table";
import { Separator } from "@/src/components/ui/separator";
import { useToast } from "@/src/components/ui/use-toast";
import { Toaster } from "@/src/components/ui/toaster";
import {
  gerarResumoFinanceiro,
  fecharContaMesa,
  validarFechamentoMesa
} from "@/src/services/fechamento";
import { formatarMoeda } from "@/src/utils/formatters";
import { 
  ArrowLeft, 
  Clock, 
  Receipt, 
  Calculator, 
  AlertTriangle,
  CheckCircle,
  X,
  Loader2
} from "lucide-react";
import Link from "next/link";
import type { ResumoFinanceiroMesa } from "@/src/types";

export default function MesaDetalhesPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();
  
  const mesaId = Number(params.mesaId);
  const shouldAutoClose = searchParams.get('action') === 'fechar';
  
  const [resumo, setResumo] = useState<ResumoFinanceiroMesa | null>(null);
  const [loading, setLoading] = useState(true);
  const [fechando, setFechando] = useState(false);
  const [podeFechar, setPodeFechar] = useState(false);
  const [motivoBloqueio, setMotivoBloqueio] = useState<string>('');

  const carregarResumo = useCallback(async () => {
    try {
      setLoading(true);
      const dadosResumo = await gerarResumoFinanceiro(mesaId);
      setResumo(dadosResumo);
      
      // Valida se pode fechar
      const validacao = await validarFechamentoMesa(mesaId);
      setPodeFechar(validacao.podeFechar);
      setMotivoBloqueio(validacao.motivo || '');
    } catch (error) {
      console.error('Erro ao carregar resumo:', error);
      const errorMessage = (error as Error).message || "Não foi possível carregar os detalhes da mesa.";
      toast({
        title: "Erro",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [mesaId, toast]);

  const handleFecharConta = useCallback(async () => {
    if (!resumo || !podeFechar) return;

    try {
      setFechando(true);

      // Usa a nova estrutura de dados da API
      await fecharContaMesa(mesaId, {
        metodo_pagamento: 'dinheiro', // Default, pode ser expandido para incluir seleção
        desconto: resumo.desconto,
        taxaServico: resumo.taxaServico
      });

      toast({
        title: "Conta Fechada!",
        description: `Mesa ${resumo.mesaNome} foi fechada com sucesso. Total: ${formatarMoeda(resumo.totalFinal)}`,
      });

      // Volta para o dashboard
      router.push('/admin/fechamento');
    } catch (error) {
      console.error('Erro ao fechar conta:', error);
      const errorMessage = (error as Error).message || "Não foi possível fechar a conta da mesa.";
      toast({
        title: "Erro",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setFechando(false);
    }
  }, [resumo, podeFechar, mesaId, toast, router]);

  const formatarTempo = (minutos: number): string => {
    if (minutos < 60) return `${minutos} min`;
    const horas = Math.floor(minutos / 60);
    const mins = minutos % 60;
    return mins === 0 ? `${horas}h` : `${horas}h ${mins}min`;
  };

  useEffect(() => {
    if (mesaId) {
      carregarResumo();
    }
  }, [mesaId, carregarResumo]);

  // Auto-fechar se veio da ação rápida e pode fechar
  useEffect(() => {
    if (shouldAutoClose && podeFechar && resumo && !fechando) {
      handleFecharConta();
    }
  }, [shouldAutoClose, podeFechar, resumo, fechando, handleFecharConta]);

  if (loading) {
    return (
      <AuthGuard>
        <div className="container mx-auto py-8 px-4">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
              <p>Carregando detalhes da mesa...</p>
            </div>
          </div>
        </div>
      </AuthGuard>
    );
  }

  if (!resumo) {
    return (
      <AuthGuard>
        <div className="container mx-auto py-8 px-4">
          <div className="text-center">
            <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Mesa não encontrada</h2>
            <p className="text-muted-foreground mb-4">
              Não foi possível carregar os dados da mesa.
            </p>
            <Button asChild>
              <Link href="/admin/fechamento">
                Voltar ao Dashboard
              </Link>
            </Button>
          </div>
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <div className="container mx-auto py-8 px-4">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="outline" size="icon" asChild>
            <Link href="/admin/fechamento">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          
          <div className="flex-1">
            <h1 className="text-2xl font-bold">{resumo.mesaNome}</h1>
            <p className="text-muted-foreground">
              Detalhamento completo da conta
            </p>
          </div>

          {/* Status da mesa */}
          {!podeFechar && (
            <Badge variant="destructive" className="flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              Pedidos Pendentes
            </Badge>
          )}
          
          {podeFechar && (
            <Badge variant="default" className="flex items-center gap-1">
              <CheckCircle className="h-3 w-3" />
              Pronta para Fechar
            </Badge>
          )}
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Coluna principal - Detalhes */}
          <div className="lg:col-span-2 space-y-6">
            {/* Informações da mesa */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Informações da Mesa
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-3">
                <div>
                  <p className="text-sm text-muted-foreground">Total de Pedidos</p>
                  <p className="text-lg font-semibold">{resumo.pedidos.length}</p>
                </div>
                {resumo.tempoTotal && (
                  <div>
                    <p className="text-sm text-muted-foreground">Tempo de Ocupação</p>
                    <p className="text-lg font-semibold">{formatarTempo(resumo.tempoTotal)}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-muted-foreground">Itens Únicos</p>
                  <p className="text-lg font-semibold">{resumo.itensConsolidados.length}</p>
                </div>
              </CardContent>
            </Card>

            {/* Itens consolidados */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Receipt className="h-5 w-5" />
                  Itens Consumidos
                </CardTitle>
                <CardDescription>
                  Produtos agrupados por tipo com quantidades totais
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Produto</TableHead>
                      <TableHead className="text-center">Qtd</TableHead>
                      <TableHead className="text-right">Valor Unit.</TableHead>
                      <TableHead className="text-right">Subtotal</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {resumo.itensConsolidados.map((item) => (
                      <TableRow key={item.produtoId}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{item.nome}</p>
                            {item.observacoes.length > 0 && (
                              <p className="text-sm text-muted-foreground">
                                {item.observacoes.join(', ')}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-center font-medium">
                          {item.quantidadeTotal}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatarMoeda(item.precoUnitario)}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {formatarMoeda(item.subtotal)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Histórico de pedidos */}
            <Card>
              <CardHeader>
                <CardTitle>Histórico de Pedidos</CardTitle>
                <CardDescription>
                  Todos os pedidos feitos por esta mesa
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {resumo.pedidos.map((pedido, index) => (
                  <div key={pedido.pedidoId} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Pedido #{pedido.pedidoId}</span>
                        <Badge variant="outline">{pedido.status}</Badge>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {new Date(pedido.timestamp).toLocaleString()}
                      </span>
                    </div>
                    
                    <div className="text-sm text-muted-foreground mb-2">
                      {pedido.itens.length} item(s) • {formatarMoeda(pedido.valorTotal)}
                    </div>
                    
                    {pedido.observacoesGerais && (
                      <p className="text-sm text-orange-600 bg-orange-50 p-2 rounded">
                        {pedido.observacoesGerais}
                      </p>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar - Resumo financeiro */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="h-5 w-5" />
                  Resumo Financeiro
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal:</span>
                    <span className="font-medium">{formatarMoeda(resumo.subtotal)}</span>
                  </div>
                  
                  {resumo.desconto > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Desconto:</span>
                      <span>-{formatarMoeda(resumo.desconto)}</span>
                    </div>
                  )}
                  
                  {resumo.taxaServico > 0 && (
                    <div className="flex justify-between">
                      <span>Taxa de Serviço:</span>
                      <span>+{formatarMoeda(resumo.taxaServico)}</span>
                    </div>
                  )}
                </div>
                
                <Separator />
                
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold">Total Final:</span>
                  <span className="text-xl font-bold text-primary">
                    {formatarMoeda(resumo.totalFinal)}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Ações */}
            <Card>
              <CardHeader>
                <CardTitle>Ações</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {!podeFechar && (
                  <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                    <div className="flex items-center gap-2 text-orange-800 mb-1">
                      <AlertTriangle className="h-4 w-4" />
                      <span className="font-medium">Não é possível fechar</span>
                    </div>
                    <p className="text-sm text-orange-700">{motivoBloqueio}</p>
                  </div>
                )}

                <Button 
                  onClick={handleFecharConta}
                  disabled={!podeFechar || fechando}
                  className="w-full"
                  size="lg"
                >
                  {fechando ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Fechando Conta...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Fechar Conta
                    </>
                  )}
                </Button>

                <Button 
                  variant="outline" 
                  onClick={carregarResumo}
                  className="w-full"
                  disabled={fechando}
                >
                  Atualizar Dados
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        <Toaster />
      </div>
    </AuthGuard>
  );
}