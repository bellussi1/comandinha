import { Button } from "@/src/components/ui/button";
import { Checkbox } from "@/src/components/ui/checkbox";
import { X } from "lucide-react";
import { useEffect, useState } from "react";

interface ModalFiltrosProps {
  isOpen: boolean;
  onClose: () => void;
  filtroVegetariano: boolean;
  filtroSemGluten: boolean;
  onAplicarFiltros: (vegetariano: boolean, semGluten: boolean) => void;
}

export function ModalFiltros({
  isOpen,
  onClose,
  filtroVegetariano,
  filtroSemGluten,
  onAplicarFiltros,
}: ModalFiltrosProps) {
  const [filtroVegetarianoTemp, setFiltroVegetarianoTemp] =
    useState(filtroVegetariano);
  const [filtroSemGlutenTemp, setFiltroSemGlutenTemp] =
    useState(filtroSemGluten);

  // Sincronizar com os filtros externos quando o modal abrir
  useEffect(() => {
    if (isOpen) {
      setFiltroVegetarianoTemp(filtroVegetariano);
      setFiltroSemGlutenTemp(filtroSemGluten);
    }
  }, [isOpen, filtroVegetariano, filtroSemGluten]);

  if (!isOpen) return null;

  const limparFiltros = () => {
    setFiltroVegetarianoTemp(false);
    setFiltroSemGlutenTemp(false);
    onAplicarFiltros(false, false);
    onClose();
  };

  const aplicarFiltros = () => {
    onAplicarFiltros(filtroVegetarianoTemp, filtroSemGlutenTemp);
    onClose();
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
          <div className="flex items-center space-x-2">
            <Checkbox
              id="vegetariano"
              checked={filtroVegetarianoTemp}
              onCheckedChange={(checked) =>
                setFiltroVegetarianoTemp(checked === true)
              }
            />
            <label
              htmlFor="vegetariano"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Vegetariano
            </label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="sem-gluten"
              checked={filtroSemGlutenTemp}
              onCheckedChange={(checked) =>
                setFiltroSemGlutenTemp(checked === true)
              }
            />
            <label
              htmlFor="sem-gluten"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Sem Glúten
            </label>
          </div>
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
