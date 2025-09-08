"use client";

import { useState, useEffect, useCallback } from "react";
import { AuthGuard } from "@/src/components/auth/AuthGuard";
import { 
  getCategorias, 
  criarCategoria, 
  atualizarCategoria, 
  deletarCategoria,
  categoriaTemProdutos,
  type CategoriaCreate 
} from "@/src/services/categoria";
import type { Categoria } from "@/src/types";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { Textarea } from "@/src/components/ui/textarea";
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
  DialogTrigger,
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/src/components/ui/table";
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
  Tag,
  AlertTriangle,
} from "lucide-react";

interface CategoriaFormData {
  nome: string;
  descricao: string;
  imagemUrl: string | File;
  ordem: number;
}

const defaultFormData: CategoriaFormData = {
  nome: "",
  descricao: "",
  imagemUrl: "",
  ordem: 0,
};

export default function CategoriasPage() {
  const { toast } = useToast();
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState<CategoriaFormData>(defaultFormData);
  const [editingCategoria, setEditingCategoria] = useState<Categoria | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [categoriaToDelete, setCategoriaToDelete] = useState<Categoria | null>(null);
  const [categoryHasProducts, setCategoryHasProducts] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Buscar categorias
  const fetchCategorias = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getCategorias();
      setCategorias(data);
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível carregar as categorias.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchCategorias();
  }, [fetchCategorias]);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nome.trim()) {
      toast({
        title: "Erro",
        description: "O nome da categoria é obrigatório.",
        variant: "destructive",
      });
      return;
    }

    try {
      setSubmitting(true);
      const categoriaData: CategoriaCreate = {
        nome: formData.nome.trim(),
        descricao: formData.descricao.trim() || undefined,
        imagemUrl: formData.imagemUrl instanceof File 
          ? formData.imagemUrl 
          : (typeof formData.imagemUrl === 'string' && formData.imagemUrl.trim()) || undefined,
        ordem: formData.ordem,
      };

      if (editingCategoria) {
        await atualizarCategoria(editingCategoria.id, categoriaData);
        toast({
          title: "Sucesso",
          description: "Categoria atualizada com sucesso!",
        });
      } else {
        await criarCategoria(categoriaData);
        toast({
          title: "Sucesso",
          description: "Categoria criada com sucesso!",
        });
      }

      setDialogOpen(false);
      setFormData(defaultFormData);
      setEditingCategoria(null);
      fetchCategorias();
    } catch (error) {
      toast({
        title: "Erro",
        description: editingCategoria 
          ? "Não foi possível atualizar a categoria." 
          : "Não foi possível criar a categoria.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Handle edit
  const handleEdit = (categoria: Categoria) => {
    setEditingCategoria(categoria);
    setFormData({
      nome: categoria.nome,
      descricao: categoria.descricao || "",
      imagemUrl: categoria.imagemUrl || "",
      ordem: categoria.ordem || 0,
    });
    setDialogOpen(true);
  };

  // Handle delete
  const handleDeleteClick = async (categoria: Categoria) => {
    setCategoriaToDelete(categoria);
    
    // Verificar se categoria tem produtos
    const temProdutos = await categoriaTemProdutos(categoria.id);
    setCategoryHasProducts(temProdutos);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!categoriaToDelete) return;

    try {
      await deletarCategoria(categoriaToDelete.id);
      toast({
        title: "Sucesso",
        description: "Categoria deletada com sucesso!",
      });
      fetchCategorias();
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível deletar a categoria.",
        variant: "destructive",
      });
    } finally {
      setDeleteDialogOpen(false);
      setCategoriaToDelete(null);
      setCategoryHasProducts(false);
    }
  };

  // Handle new category
  const handleNew = () => {
    setEditingCategoria(null);
    setFormData(defaultFormData);
    setDialogOpen(true);
  };

  return (
    <AuthGuard>
      <div className="container mx-auto py-8 px-4">
        <div className="flex flex-row flex-wrap items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Gerenciar Categorias</h1>
            <p className="text-muted-foreground">
              Organize o cardápio criando e editando categorias
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" onClick={fetchCategorias} disabled={loading}>
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Atualizar
            </Button>
            <Button onClick={handleNew}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Categoria
            </Button>
          </div>
        </div>

        {/* Tabela de Categorias */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Tag className="h-5 w-5 mr-2" />
              Categorias Cadastradas
            </CardTitle>
            <CardDescription>
              {categorias.length} categoria{categorias.length !== 1 ? 's' : ''} encontrada{categorias.length !== 1 ? 's' : ''}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center items-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary mr-2" />
                <span>Carregando categorias...</span>
              </div>
            ) : categorias.length === 0 ? (
              <div className="text-center py-8">
                <Tag className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Nenhuma categoria encontrada</h3>
                <p className="text-muted-foreground mb-4">
                  Comece criando sua primeira categoria para organizar o cardápio.
                </p>
                <Button onClick={handleNew}>
                  <Plus className="h-4 w-4 mr-2" />
                  Criar Primeira Categoria
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Ordem</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categorias.map((categoria) => (
                    <TableRow key={categoria.id}>
                      <TableCell className="font-medium">{categoria.nome}</TableCell>
                      <TableCell>{categoria.descricao || "-"}</TableCell>
                      <TableCell>{categoria.ordem || 0}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(categoria)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteClick(categoria)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Dialog para Criar/Editar */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingCategoria ? "Editar Categoria" : "Nova Categoria"}
              </DialogTitle>
              <DialogDescription>
                {editingCategoria 
                  ? "Atualize as informações da categoria." 
                  : "Preencha os dados para criar uma nova categoria."}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="nome">Nome *</Label>
                <Input
                  id="nome"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  placeholder="Nome da categoria"
                  required
                />
              </div>
              <div>
                <Label htmlFor="descricao">Descrição</Label>
                <Textarea
                  id="descricao"
                  value={formData.descricao}
                  onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                  placeholder="Descrição da categoria (opcional)"
                  rows={3}
                />
              </div>
              <div>
                <ImageUpload
                  label="Imagem da Categoria (Opcional)"
                  value={formData.imagemUrl}
                  onChange={(value) => setFormData({ ...formData, imagemUrl: value })}
                  maxSize={2}
                />
              </div>
              <div>
                <Label htmlFor="ordem">Ordem de Exibição</Label>
                <Input
                  id="ordem"
                  type="number"
                  value={formData.ordem}
                  onChange={(e) => setFormData({ ...formData, ordem: Number(e.target.value) })}
                  placeholder="0"
                  min="0"
                />
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
                  {editingCategoria ? "Atualizar" : "Criar"}
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
                {categoryHasProducts ? (
                  <div className="space-y-2">
                    <p>
                      <strong>Atenção!</strong> A categoria &ldquo;{categoriaToDelete?.nome}&rdquo; possui produtos vinculados a ela.
                    </p>
                    <p>
                      Ao deletar esta categoria, todos os produtos vinculados também serão removidos do sistema. Esta ação não pode ser desfeita.
                    </p>
                    <p>Tem certeza de que deseja continuar?</p>
                  </div>
                ) : (
                  <p>
                    Tem certeza de que deseja deletar a categoria &ldquo;{categoriaToDelete?.nome}&rdquo;? 
                    Esta ação não pode ser desfeita.
                  </p>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDelete}
                className="bg-destructive hover:bg-destructive/90"
              >
                {categoryHasProducts ? "Deletar mesmo assim" : "Deletar"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Toaster />
      </div>
    </AuthGuard>
  );
}