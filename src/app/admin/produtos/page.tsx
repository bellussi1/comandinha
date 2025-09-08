"use client";

import { useState, useEffect, useCallback } from "react";
import { AuthGuard } from "@/src/components/auth/AuthGuard";
import { 
  getProdutos, 
  criarProduto, 
  atualizarProduto, 
  deletarProduto,
  type ProdutoCreate 
} from "@/src/services/produtos";
import { getCategorias } from "@/src/services/categoria";
import type { Produto, Categoria } from "@/src/types";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { Textarea } from "@/src/components/ui/textarea";
import { Checkbox } from "@/src/components/ui/checkbox";
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
  DialogHeader,
  DialogTitle,
} from "@/src/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/src/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/src/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/src/components/ui/table";
import { Badge } from "@/src/components/ui/badge";
import { Label } from "@/src/components/ui/label";
import { useToast } from "@/src/components/ui/use-toast";
import { Toaster } from "@/src/components/ui/toaster";
import { ImageUpload } from "@/src/components/ui/image-upload";
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  RefreshCw,
  Package,
  AlertTriangle,
  Star,
} from "lucide-react";

interface ProdutoFormData {
  nome: string;
  descricao: string;
  preco: number;
  categoriaId: number;
  imagem: string | File;
  popular: boolean;
  tempoPreparo: number;
  restricoes: string[];
}

const defaultFormData: ProdutoFormData = {
  nome: "",
  descricao: "",
  preco: 0,
  categoriaId: 0,
  imagem: "",
  popular: false,
  tempoPreparo: 0,
  restricoes: [],
};

const restricoesDisponiveis = [
  "vegetariano",
  "vegano", 
  "sem glúten",
  "sem lactose",
  "apimentado",
  "orgânico",
];

export default function ProdutosPage() {
  const { toast } = useToast();
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState<ProdutoFormData>(defaultFormData);
  const [editingProduto, setEditingProduto] = useState<Produto | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [produtoToDelete, setProdutoToDelete] = useState<Produto | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Buscar dados
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [produtosData, categoriasData] = await Promise.all([
        getProdutos(),
        getCategorias()
      ]);
      setProdutos(produtosData);
      setCategorias(categoriasData);
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível carregar os dados.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Get categoria name by ID
  const getCategoriaNome = (categoriaId: string | number) => {
    const categoria = categorias.find(c => c.id === Number(categoriaId));
    return categoria?.nome || "Categoria não encontrada";
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nome.trim()) {
      toast({
        title: "Erro",
        description: "O nome do produto é obrigatório.",
        variant: "destructive",
      });
      return;
    }

    if (formData.categoriaId === 0) {
      toast({
        title: "Erro",
        description: "Selecione uma categoria para o produto.",
        variant: "destructive",
      });
      return;
    }

    if (formData.preco <= 0) {
      toast({
        title: "Erro",
        description: "O preço deve ser maior que zero.",
        variant: "destructive",
      });
      return;
    }

    try {
      setSubmitting(true);
      const produtoData: ProdutoCreate = {
        nome: formData.nome.trim(),
        descricao: formData.descricao.trim() || undefined,
        preco: formData.preco,
        categoriaId: formData.categoriaId,
        imagem: formData.imagem instanceof File 
          ? formData.imagem 
          : (typeof formData.imagem === 'string' && formData.imagem.trim()) || undefined,
        popular: formData.popular,
        tempoPreparo: formData.tempoPreparo > 0 ? formData.tempoPreparo : undefined,
        restricoes: formData.restricoes.length > 0 ? formData.restricoes : undefined,
      };

      if (editingProduto) {
        await atualizarProduto(editingProduto.id, produtoData);
        toast({
          title: "Sucesso",
          description: "Produto atualizado com sucesso!",
        });
      } else {
        await criarProduto(produtoData);
        toast({
          title: "Sucesso",
          description: "Produto criado com sucesso!",
        });
      }

      setDialogOpen(false);
      setFormData(defaultFormData);
      setEditingProduto(null);
      fetchData();
    } catch (error) {
      toast({
        title: "Erro",
        description: editingProduto 
          ? "Não foi possível atualizar o produto." 
          : "Não foi possível criar o produto.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Handle edit
  const handleEdit = (produto: Produto) => {
    setEditingProduto(produto);
    setFormData({
      nome: produto.nome,
      descricao: produto.descricao || "",
      preco: produto.preco,
      categoriaId: Number(produto.categoria),
      imagem: produto.imagem || "",
      popular: produto.popular || false,
      tempoPreparo: produto.tempoPreparo || 0,
      restricoes: produto.restricoes || [],
    });
    setDialogOpen(true);
  };

  // Handle delete
  const handleDeleteClick = (produto: Produto) => {
    setProdutoToDelete(produto);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!produtoToDelete) return;

    try {
      await deletarProduto(produtoToDelete.id);
      toast({
        title: "Sucesso",
        description: "Produto deletado com sucesso!",
      });
      fetchData();
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível deletar o produto.",
        variant: "destructive",
      });
    } finally {
      setDeleteDialogOpen(false);
      setProdutoToDelete(null);
    }
  };

  // Handle new product
  const handleNew = () => {
    setEditingProduto(null);
    setFormData(defaultFormData);
    setDialogOpen(true);
  };

  // Handle restriction toggle
  const toggleRestricao = (restricao: string) => {
    setFormData(prev => ({
      ...prev,
      restricoes: prev.restricoes.includes(restricao)
        ? prev.restricoes.filter(r => r !== restricao)
        : [...prev.restricoes, restricao]
    }));
  };

  return (
    <AuthGuard>
      <div className="container mx-auto py-8 px-4">
        <div className="flex flex-row flex-wrap items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Gerenciar Produtos</h1>
            <p className="text-muted-foreground">
              Gerencie o cardápio adicionando, editando e removendo produtos
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" onClick={fetchData} disabled={loading}>
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Atualizar
            </Button>
            <Button onClick={handleNew} disabled={categorias.length === 0}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Produto
            </Button>
          </div>
        </div>

        {/* Aviso se não há categorias */}
        {categorias.length === 0 && !loading && (
          <Card className="border-orange-200 bg-orange-50 mb-6">
            <CardContent className="pt-6">
              <div className="flex items-center">
                <AlertTriangle className="h-5 w-5 text-orange-600 mr-2" />
                <p className="text-orange-800">
                  Você precisa criar pelo menos uma categoria antes de adicionar produtos.{" "}
                  <a href="/admin/categorias" className="underline font-medium">
                    Clique aqui para gerenciar categorias
                  </a>
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tabela de Produtos */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Package className="h-5 w-5 mr-2" />
              Produtos Cadastrados
            </CardTitle>
            <CardDescription>
              {produtos.length} produto{produtos.length !== 1 ? 's' : ''} encontrado{produtos.length !== 1 ? 's' : ''}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center items-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary mr-2" />
                <span>Carregando produtos...</span>
              </div>
            ) : produtos.length === 0 ? (
              <div className="text-center py-8">
                <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Nenhum produto encontrado</h3>
                <p className="text-muted-foreground mb-4">
                  {categorias.length === 0 
                    ? "Primeiro crie algumas categorias, depois adicione produtos ao cardápio."
                    : "Comece adicionando produtos ao seu cardápio."}
                </p>
                {categorias.length > 0 && (
                  <Button onClick={handleNew}>
                    <Plus className="h-4 w-4 mr-2" />
                    Criar Primeiro Produto
                  </Button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead>Preço</TableHead>
                      <TableHead>Popular</TableHead>
                      <TableHead>Restrições</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {produtos.map((produto) => (
                      <TableRow key={produto.id}>
                        <TableCell>
                          <div className="flex items-center space-x-3">
                            {produto.imagem && (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img 
                                src={produto.imagem.trimEnd()} 
                                alt={produto.nome}
                                className="w-10 h-10 rounded-lg object-cover"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                }}
                              />
                            )}
                            <div>
                              <div className="font-medium flex items-center">
                                {produto.nome}
                                {produto.popular && (
                                  <Star className="h-4 w-4 ml-2 text-yellow-500 fill-current" />
                                )}
                              </div>
                              {produto.descricao && (
                                <div className="text-sm text-muted-foreground max-w-xs truncate">
                                  {produto.descricao}
                                </div>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{getCategoriaNome(produto.categoria)}</TableCell>
                        <TableCell className="font-medium">
                          R$ {produto.preco.toFixed(2)}
                        </TableCell>
                        <TableCell>
                          {produto.popular ? (
                            <Badge variant="default" className="bg-yellow-100 text-yellow-800">
                              <Star className="h-3 w-3 mr-1" />
                              Popular
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {produto.restricoes && produto.restricoes.length > 0 ? (
                              produto.restricoes.map((restricao) => (
                                <Badge key={restricao} variant="secondary" className="text-xs">
                                  {restricao}
                                </Badge>
                              ))
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(produto)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteClick(produto)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Dialog para Criar/Editar */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingProduto ? "Editar Produto" : "Novo Produto"}
              </DialogTitle>
              <DialogDescription>
                {editingProduto 
                  ? "Atualize as informações do produto." 
                  : "Preencha os dados para criar um novo produto."}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="nome">Nome *</Label>
                  <Input
                    id="nome"
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    placeholder="Nome do produto"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="categoria">Categoria *</Label>
                  <Select 
                    value={formData.categoriaId.toString()} 
                    onValueChange={(value) => setFormData({ ...formData, categoriaId: Number(value) })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      {categorias.map((categoria) => (
                        <SelectItem key={categoria.id} value={categoria.id.toString()}>
                          {categoria.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="descricao">Descrição</Label>
                <Textarea
                  id="descricao"
                  value={formData.descricao}
                  onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                  placeholder="Descrição do produto (opcional)"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="preco">Preço *</Label>
                  <Input
                    id="preco"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.preco}
                    onChange={(e) => setFormData({ ...formData, preco: Number(e.target.value) })}
                    placeholder="0.00"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="tempoPreparo">Tempo de Preparo (min)</Label>
                  <Input
                    id="tempoPreparo"
                    type="number"
                    min="0"
                    value={formData.tempoPreparo}
                    onChange={(e) => setFormData({ ...formData, tempoPreparo: Number(e.target.value) })}
                    placeholder="0"
                  />
                </div>
              </div>

              <div>
                <ImageUpload
                  label="Imagem do Produto"
                  value={formData.imagem}
                  onChange={(value) => setFormData({ ...formData, imagem: value })}
                  maxSize={2}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="popular"
                  checked={formData.popular}
                  onCheckedChange={(checked) => setFormData({ ...formData, popular: checked as boolean })}
                />
                <Label htmlFor="popular" className="flex items-center">
                  <Star className="h-4 w-4 mr-1" />
                  Produto Popular
                </Label>
              </div>

              <div>
                <Label>Restrições Alimentares</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {restricoesDisponiveis.map((restricao) => (
                    <div key={restricao} className="flex items-center space-x-2">
                      <Checkbox
                        id={restricao}
                        checked={formData.restricoes.includes(restricao)}
                        onCheckedChange={() => toggleRestricao(restricao)}
                      />
                      <Label htmlFor={restricao} className="text-sm capitalize">
                        {restricao}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setDialogOpen(false)}
                  disabled={submitting}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  {editingProduto ? "Atualizar" : "Criar"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Dialog de Confirmação de Exclusão */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center">
                <AlertTriangle className="h-5 w-5 mr-2 text-destructive" />
                Confirmar Exclusão
              </AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza de que deseja deletar o produto &ldquo;{produtoToDelete?.nome}&rdquo;? 
                Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDelete}
                className="bg-destructive hover:bg-destructive/90"
              >
                Deletar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Toaster />
      </div>
    </AuthGuard>
  );
}