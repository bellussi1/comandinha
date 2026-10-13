import { Button } from "@/src/components/ui/button";
import { Checkbox } from "@/src/components/ui/checkbox";
import { X } from "lucide-react";
import { useEffect, useState } from "react";

interface ModalFiltrosProps {
  isOpen: boolean;
  onClose: () => void;
  filtrosAtivos: string[];
  onAplicarFiltros: (filtros: string[]) => void;
}

const restricoesDisponiveis = [
  { id: "vegetariano", nome: "Vegetariano", emoji: "🥬" },
  { id: "vegano", nome: "Vegano", emoji: "🌱" },
  { id: "sem glúten", nome: "Sem Glúten", emoji: "🌾" },
  { id: "sem lactose", nome: "Sem Lactose", emoji: "🥛" },
  { id: "apimentado", nome: "Apimentado", emoji: "🌶️" },
  { id: "orgânico", nome: "Orgânico", emoji: "🌿" },
];

export function ModalFiltros({
  isOpen,
  onClose,
  filtrosAtivos,
  onAplicarFiltros,
}: ModalFiltrosProps) {
  const [filtrosTemp, setFiltrosTemp] = useState<string[]>(filtrosAtivos);

  // Sincronizar com os filtros externos quando o modal abrir
  useEffect(() => {
    if (isOpen) {
      setFiltrosTemp(filtrosAtivos);
    }
  }, [isOpen, filtrosAtivos]);

  if (!isOpen) return null;

  const limparFiltros = () => {
    setFiltrosTemp([]);
    onAplicarFiltros([]);
    onClose();
  };

  const aplicarFiltros = () => {
    onAplicarFiltros(filtrosTemp);
    onClose();
  };

  const toggleFiltro = (restricaoId: string) => {
    setFiltrosTemp(prev => 
      prev.includes(restricaoId)
        ? prev.filter(id => id !== restricaoId)
        : [...prev, restricaoId]
    );
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center">
      <div className="bg-background w-full max-w-md rounded-t-lg sm:rounded-lg shadow-lg overflow-hidden">
        <div className="p-4 border-b">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-lg">Filtros</h3>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
              <span className="sr-only">Fechar</span>
            </Button>
          </div>
        </div>

        <div className="p-4 space-y-4">
          <p className="text-sm text-muted-foreground mb-4">
            Selecione as restrições alimentares que deseja filtrar:
          </p>
          
          <div className="grid grid-cols-1 gap-3">
            {restricoesDisponiveis.map((restricao) => (
              <div key={restricao.id} className="flex items-center space-x-3">
                <Checkbox
                  id={restricao.id}
                  checked={filtrosTemp.includes(restricao.id)}
                  onCheckedChange={() => toggleFiltro(restricao.id)}
                />
                <label
                  htmlFor={restricao.id}
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-2 cursor-pointer"
                >
                  <span className="text-lg">{restricao.emoji}</span>
                  {restricao.nome}
                </label>
              </div>
            ))}
          </div>
          
          {filtrosTemp.length > 0 && (
            <div className="mt-4 p-3 bg-muted/50 rounded-md">
              <p className="text-xs text-muted-foreground mb-2">
                Filtros ativos ({filtrosTemp.length}):
              </p>
              <div className="flex flex-wrap gap-1">
                {filtrosTemp.map(filtroId => {
                  const restricao = restricoesDisponiveis.find(r => r.id === filtroId);
                  return restricao ? (
                    <span key={filtroId} className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded-full text-xs">
                      {restricao.emoji} {restricao.nome}
                    </span>
                  ) : null;
                })}
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t flex justify-end gap-2">
          <Button variant="outline" onClick={limparFiltros}>
            Limpar
          </Button>
          <Button onClick={aplicarFiltros}>Aplicar</Button>
        </div>
      </div>
    </div>
  );
}
