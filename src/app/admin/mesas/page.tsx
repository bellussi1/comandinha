"use client";

import { AuthGuard } from "@/src/components/auth/AuthGuard";
import { Button } from "@/src/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/src/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/src/components/ui/dialog";
import { Input } from "@/src/components/ui/input";
import { Label } from "@/src/components/ui/label";
import { Toaster } from "@/src/components/ui/toaster";
import { useToast } from "@/src/components/ui/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/src/components/ui/alert-dialog";
import { Badge } from "@/src/components/ui/badge";
import { mesaAdminService } from "@/src/services/mesaAdmin";
import { MesaAdmin } from "@/src/types";
import {
  AlertCircle,
  Loader2,
  Plus,
  RefreshCw,
  Table,
  Trash2,
  Power,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

export default function MesasAdminPage() {
  const { toast } = useToast();

  const [mesas, setMesas] = useState<MesaAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [criandoMesa, setCriandoMesa] = useState(false);
  const [atualizandoMesa, setAtualizandoMesa] = useState<string | null>(null);
  const [novaMesaNome, setNovaMesaNome] = useState("");
  const [dialogAberto, setDialogAberto] = useState(false);

  const fetchMesas = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const mesasData = await mesaAdminService.listarMesas();
      setMesas(mesasData);
    } catch (error) {
      console.error("Erro ao carregar mesas:", error);
      const errorMessage = (error as Error).message || "Falha ao carregar mesas. Verifique sua conexão.";
      setError(errorMessage);
      toast({
        title: "Erro",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchMesas();
  }, [fetchMesas]);

  const handleCriarMesa = async () => {
    if (!novaMesaNome.trim()) {
      toast({
        title: "Erro",
        description: "Por favor, informe o nome da mesa.",
        variant: "destructive",
      });
      return;
    }

    try {
      setCriandoMesa(true);
      await mesaAdminService.criarMesa({ nome: novaMesaNome.trim() });
      
      toast({
        title: "Mesa criada",
        description: `Mesa "${novaMesaNome}" foi criada com sucesso.`,
      });
      
      setNovaMesaNome("");
      setDialogAberto(false);
      await fetchMesas();
    } catch (error) {
      console.error("Erro ao criar mesa:", error);
      const errorMessage = (error as Error).message || "Não foi possível criar a mesa.";
      toast({
        title: "Erro",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setCriandoMesa(false);
    }
  };

  const handleDeletarMesa = async (mesa: MesaAdmin) => {
    try {
      setAtualizandoMesa(`delete_${mesa.id}`);
      await mesaAdminService.deletarMesa(mesa.id);
      
      toast({
        title: "Mesa deletada",
        description: `Mesa "${mesa.nome}" foi deletada com sucesso.`,
      });
      
      await fetchMesas();
    } catch (error) {
      console.error("Erro ao deletar mesa:", error);
      const errorMessage = (error as Error).message || "Não foi possível deletar a mesa.";
      toast({
        title: "Erro",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setAtualizandoMesa(null);
    }
  };


  const getStatusBadge = (status: "disponivel" | "em_uso") => {
    const colorClass = mesaAdminService.getStatusColor(status);
    const text = mesaAdminService.getStatusText(status);

    return (
      <Badge className={colorClass}>
        {text}
      </Badge>
    );
  };

  const getStatusIcon = (status: "disponivel" | "em_uso") => {
    switch (status) {
      case "disponivel":
        return <Power className="h-4 w-4 text-green-600" />;
      case "em_uso":
        return <Table className="h-4 w-4 text-blue-600" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-600" />;
    }
  };

  return (
    <AuthGuard>
      <div className="container mx-auto py-8 px-4">
        <div className="flex flex-row items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Gerenciar Mesas
            </h1>
            <p className="text-muted-foreground">
              Crie, delete e gerencie o status das mesas do restaurante
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={fetchMesas} disabled={loading}>
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Atualizar
            </Button>
            
            <Dialog open={dialogAberto} onOpenChange={setDialogAberto}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Nova Mesa
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Criar Nova Mesa</DialogTitle>
                  <DialogDescription>
                    Informe o nome da nova mesa que será criada.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="nome">Nome da Mesa</Label>
                    <Input
                      id="nome"
                      placeholder="Ex: Mesa 01, Mesa VIP, etc."
                      value={novaMesaNome}
                      onChange={(e) => setNovaMesaNome(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleCriarMesa()}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setDialogAberto(false);
                      setNovaMesaNome("");
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button onClick={handleCriarMesa} disabled={criandoMesa}>
                    {criandoMesa && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                    Criar Mesa
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Status das Mesas */}
        {!loading && mesas.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Disponíveis</p>
                    <p className="text-2xl font-bold text-green-600">
                      {mesas.filter(m => m.status === "disponivel").length}
                    </p>
                  </div>
                  <Power className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Em Uso</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {mesas.filter(m => m.status === "em_uso").length}
                    </p>
                  </div>
                  <Table className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total</p>
                    <p className="text-2xl font-bold text-gray-600">
                      {mesas.length}
                    </p>
                  </div>
                  <AlertCircle className="h-8 w-8 text-gray-600" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Lista de Mesas */}
        {loading ? (
          <div className="flex justify-center items-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary mr-2" />
            <span>Carregando mesas...</span>
          </div>
        ) : error ? (
          <Card className="border-destructive">
            <CardContent className="pt-6 text-center">
              <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                Erro ao carregar mesas
              </h3>
              <p className="text-muted-foreground mb-4">{error}</p>
              <Button onClick={fetchMesas}>Tentar novamente</Button>
            </CardContent>
          </Card>
        ) : mesas.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center">
              <Table className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                Nenhuma mesa cadastrada
              </h3>
              <p className="text-muted-foreground mb-4">
                Comece criando sua primeira mesa.
              </p>
              <Dialog open={dialogAberto} onOpenChange={setDialogAberto}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Criar Primeira Mesa
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Criar Nova Mesa</DialogTitle>
                    <DialogDescription>
                      Informe o nome da nova mesa que será criada.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="nome">Nome da Mesa</Label>
                      <Input
                        id="nome"
                        placeholder="Ex: Mesa 01, Mesa VIP, etc."
                        value={novaMesaNome}
                        onChange={(e) => setNovaMesaNome(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleCriarMesa()}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setDialogAberto(false);
                        setNovaMesaNome("");
                      }}
                    >
                      Cancelar
                    </Button>
                    <Button onClick={handleCriarMesa} disabled={criandoMesa}>
                      {criandoMesa && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                      Criar Mesa
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {mesas.map((mesa) => (
              <Card key={mesa.id} className="overflow-hidden">
                <CardHeader className="bg-muted/50">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        {getStatusIcon(mesa.status)}
                        {mesa.nome}
                      </CardTitle>
                      <CardDescription>
                        ID: {mesa.id} • UUID: {mesa.uuid.slice(0, 8)}...
                      </CardDescription>
                    </div>
                    {getStatusBadge(mesa.status)}
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div className="text-sm text-muted-foreground">
                      <p><strong>Status:</strong> {mesaAdminService.getStatusText(mesa.status)}</p>
                      {mesa.criadaEm && (
                        <p><strong>Criada em:</strong> {new Date(mesa.criadaEm).toLocaleDateString()}</p>
                      )}
                    </div>
                    
                    <div className="flex flex-col gap-2">
                      {mesa.status === "em_uso" && (
                        <div className="text-xs text-blue-600 bg-blue-50 p-2 rounded">
                          Esta mesa possui pedidos ativos. Use o fechamento de contas para liberar a mesa.
                        </div>
                      )}

                      {mesa.status !== "em_uso" && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="destructive"
                              size="sm"
                              disabled={atualizandoMesa === `delete_${mesa.id}`}
                            >
                              {atualizandoMesa === `delete_${mesa.id}` ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                              ) : (
                                <Trash2 className="h-4 w-4 mr-2" />
                              )}
                              Deletar
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                              <AlertDialogDescription>
                                Tem certeza de que deseja deletar a mesa &quot;{mesa.nome}&quot;? 
                                Esta ação não pode ser desfeita.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeletarMesa(mesa)}
                              >
                                Deletar
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Toaster />
      </div>
    </AuthGuard>
  );
}