"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Clock,
  CheckCircle,
  Utensils,
  ShoppingBag,
  Ban,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { Card, CardContent } from "@/src/components/ui/card";
import { Badge } from "@/src/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/src/components/ui/sheet";
import { useToast } from "@/src/components/ui/use-toast";
import {
  getPedidosPorMesa,
  atualizarStatusPedido,
} from "@/src/services/pedidos";
import { getMesaByNumero, atualizarStatusMesa } from "@/src/services/mesas";
import type { Pedido, Mesa } from "@/src/types";

export default function PedidosMesaPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const { mesa } = params;

  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [mesaInfo, setMesaInfo] = useState<Mesa | null>(null);
  const [atualizando, setAtualizando] = useState(false);
  const [cancelarPedidoId, setCancelarPedidoId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof mesa === "string") {
      const pedidosMesa = getPedidosPorMesa(mesa);
      setPedidos(pedidosMesa);

      const infoMesa = getMesaByNumero(mesa);
      if (infoMesa) setMesaInfo(infoMesa);
    }
  }, [mesa]);

  const formatarData = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatarTempoRelativo = (timestamp: number) => {
    const agora = Date.now();
    const diff = agora - timestamp;
    const minutos = Math.floor(diff / 60000);

    if (minutos < 1) return "Agora mesmo";
    if (minutos === 1) return "1 minuto atrás";
    if (minutos < 60) return `${minutos} minutos atrás`;

    const horas = Math.floor(minutos / 60);
    if (horas === 1) return "1 hora atrás";
    if (horas < 24) return `${horas} horas atrás`;

    const dias = Math.floor(horas / 24);
    if (dias === 1) return "1 dia atrás";
    return `${dias} dias atrás`;
  };

  const getStatusBadge = (status: Pedido["status"]) => {
    switch (status) {
      case "confirmado":
        return <Badge className="bg-blue-500">Confirmado</Badge>;
      case "em-preparo":
        return <Badge className="bg-orange-500">Em preparo</Badge>;
      case "entregue":
        return <Badge className="bg-green-500">Entregue</Badge>;
      default:
        return null;
    }
  };

  const getStatusIcon = (status: Pedido["status"]) => {
    switch (status) {
      case "confirmado":
        return <CheckCircle className="h-5 w-5 text-blue-500" />;
      case "em-preparo":
        return <Utensils className="h-5 w-5 text-orange-500" />;
      case "entregue":
        return <ShoppingBag className="h-5 w-5 text-green-500" />;
      default:
        return null;
    }
  };

  const getProximoStatus = (
    status: Pedido["status"]
  ): Pedido["status"] | null => {
    switch (status) {
      case "confirmado":
        return "em-preparo";
      case "em-preparo":
        return "entregue";
      default:
        return null;
    }
  };

  const avancarStatus = async (pedido: Pedido) => {
    const novoStatus = getProximoStatus(pedido.status);
    if (!novoStatus || atualizando) return;

    setAtualizando(true);
    try {
      const sucesso = atualizarStatusPedido(pedido.id, novoStatus);
      if (sucesso) {
        setPedidos((prev) =>
          prev.map((p) =>
            p.id === pedido.id ? { ...p, status: novoStatus } : p
          )
        );
        toast({
          title: "Status atualizado",
          description: `Pedido #${pedido.id.slice(-4)} ${
            novoStatus === "em-preparo"
              ? "está sendo preparado"
              : "foi entregue"
          }`,
        });
      }
    } catch (error) {
      toast({
        title: "Erro ao atualizar status",
        description: "Tente novamente em alguns instantes",
        variant: "destructive",
      });
    } finally {
      setAtualizando(false);
    }
  };

  const cancelarPedido = (pedidoId: string) => {
    // Aqui você implementaria a lógica real de cancelamento
    setPedidos((prev) => prev.filter((p) => p.id !== pedidoId));
    setCancelarPedidoId(null);
    toast({
      title: "Pedido cancelado",
      description: `O pedido #${pedidoId.slice(-4)} foi cancelado`,
    });
  };

  const liberarMesa = () => {
    if (typeof mesa === "string") {
      atualizarStatusMesa(mesa, "livre");
      toast({
        title: "Mesa liberada",
        description: "A mesa está disponível para novos clientes",
      });
      router.push("/admin");
    }
  };

  const calcularTotalPedido = (pedido: Pedido) => {
    const subtotal = pedido.itens.reduce(
      (total, item) => total + item.preco * item.quantidade,
      0
    );
    return subtotal * 1.1; // 10% de taxa de serviço
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-10 bg-background border-b">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/admin">
                <ArrowLeft className="h-5 w-5" />
                <span className="sr-only">Voltar</span>
              </Link>
            </Button>
            <div>
              <h1 className="font-bold text-lg">Mesa {mesa}</h1>
              {mesaInfo && (
                <p className="text-sm text-muted-foreground">
                  Última atualização:{" "}
                  {formatarTempoRelativo(mesaInfo.ultimaAtualizacao)}
                </p>
              )}
            </div>
          </div>
          <Button variant="destructive" onClick={liberarMesa}>
            Liberar mesa
          </Button>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-6">
        {pedidos.length > 0 ? (
          <div className="space-y-6">
            {pedidos
              .slice()
              .reverse()
              .map((pedido) => (
                <Card key={pedido.id} className="overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-center mb-3">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => avancarStatus(pedido)}
                          disabled={pedido.status === "entregue" || atualizando}
                        >
                          {getStatusIcon(pedido.status)}
                        </Button>
                        <h3 className="font-medium">
                          Pedido #{pedido.id.slice(-4)}
                        </h3>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(pedido.status)}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => setCancelarPedidoId(pedido.id)}
                          disabled={pedido.status === "entregue"}
                        >
                          <Ban className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="flex items-center text-sm text-muted-foreground mb-4">
                      <Clock className="h-4 w-4 mr-1" />
                      {formatarData(pedido.timestamp)}
                    </div>

                    <div className="space-y-2 mb-4">
                      {pedido.itens.map((item, index) => (
                        <div
                          key={index}
                          className="flex justify-between items-center"
                        >
                          <div>
                            <span className="font-medium">
                              {item.quantidade}x{" "}
                            </span>
                            <span>{item.nome}</span>
                            {item.observacoes && (
                              <p className="text-xs text-muted-foreground">
                                Obs: {item.observacoes}
                              </p>
                            )}
                          </div>
                          <span>
                            R${" "}
                            {(item.preco * item.quantidade)
                              .toFixed(2)
                              .replace(".", ",")}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="border-t pt-3">
                      <div className="flex justify-between items-center text-sm text-muted-foreground">
                        <span>Subtotal</span>
                        <span>
                          R${" "}
                          {(calcularTotalPedido(pedido) / 1.1)
                            .toFixed(2)
                            .replace(".", ",")}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-sm text-muted-foreground mt-1">
                        <span>Taxa de serviço (10%)</span>
                        <span>
                          R${" "}
                          {((calcularTotalPedido(pedido) / 1.1) * 0.1)
                            .toFixed(2)
                            .replace(".", ",")}
                        </span>
                      </div>
                      <div className="flex justify-between items-center font-medium mt-2">
                        <span>Total</span>
                        <span>
                          R${" "}
                          {calcularTotalPedido(pedido)
                            .toFixed(2)
                            .replace(".", ",")}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="mx-auto w-16 h-16 mb-4 text-muted-foreground">
              <Clock className="w-16 h-16" />
            </div>
            <h2 className="text-xl font-bold mb-2">Nenhum pedido encontrado</h2>
            <p className="text-muted-foreground mb-6">
              Esta mesa ainda não possui pedidos registrados
            </p>
          </div>
        )}
      </main>

      {/* Modal de cancelamento */}
      <Sheet
        open={!!cancelarPedidoId}
        onOpenChange={() => setCancelarPedidoId(null)}
      >
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Cancelar pedido</SheetTitle>
            <SheetDescription>
              Tem certeza que deseja cancelar este pedido? Esta ação não pode
              ser desfeita.
            </SheetDescription>
          </SheetHeader>

          <div className="flex items-center gap-4 my-6 p-4 bg-destructive/10 rounded-md text-destructive">
            <AlertTriangle className="h-6 w-6" />
            <div className="text-sm">
              <p className="font-medium">Atenção</p>
              <p>
                O cancelamento do pedido será informado à cozinha e ao cliente.
              </p>
            </div>
          </div>

          <SheetFooter>
            <Button variant="outline" onClick={() => setCancelarPedidoId(null)}>
              Voltar
            </Button>
            <Button
              variant="destructive"
              onClick={() =>
                cancelarPedidoId && cancelarPedido(cancelarPedidoId)
              }
            >
              Confirmar cancelamento
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
