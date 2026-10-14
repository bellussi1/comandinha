"use client";

import { AuthGuard } from "@/src/components/auth/AuthGuard";
import { MesasDashboard } from "@/src/components/fechamento/MesasDashboard";
import { Toaster } from "@/src/components/ui/toaster";
import { Calculator, Receipt } from "lucide-react";

export default function FechamentoPage() {
  return (
    <AuthGuard>
      <div className="container mx-auto py-8 px-4">
        {/* Header da página */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
          <div className="flex items-center gap-3 mb-4 sm:mb-0">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Calculator className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                Fechamento de Contas
              </h1>
              <p className="text-muted-foreground">
                Gerencie o controle financeiro das mesas ocupadas
              </p>
            </div>
          </div>
        </div>

        {/* Dashboard principal */}
        <MesasDashboard />
        
        <Toaster />
      </div>
    </AuthGuard>
  );
}