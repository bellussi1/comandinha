"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthService } from "@/src/services/auth";
import { Loader2 } from "lucide-react";

interface AuthGuardProps {
  children: React.ReactNode;
}

/**
 * Componente para proteger rotas que requerem autenticação
 */
export function AuthGuard({ children }: AuthGuardProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Verificar se tem token
        const hasToken = AuthService.isAuthenticated();
        
        if (!hasToken) {
          router.replace("/admin/login");
          return;
        }

        // Validar token com o servidor
        const isValid = await AuthService.validateToken();
        
        if (!isValid) {
          router.replace("/admin/login");
          return;
        }

        setIsAuthenticated(true);
      } catch (error) {
        console.error("Erro na verificação de auth:", error);
        router.replace("/admin/login");
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Verificando autenticação...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // O redirect já foi feito no useEffect
  }

  return <>{children}</>;
}