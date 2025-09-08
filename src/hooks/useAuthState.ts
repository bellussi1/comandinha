"use client";

import { useState, useEffect } from "react";
import { AuthService } from "@/src/services/auth";
import type { User } from "@/src/types/auth";

/**
 * Hook para gerenciar estado de autenticação
 */
export function useAuthState() {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const currentUser = AuthService.getCurrentUser();
        const isAuth = AuthService.isAuthenticated();

        if (isAuth && currentUser) {
          // Validar token com o servidor
          const isValid = await AuthService.validateToken();
          if (isValid) {
            setUser(currentUser);
            setIsAuthenticated(true);
          } else {
            // Token inválido, limpar dados
            AuthService.logout();
            setUser(null);
            setIsAuthenticated(false);
          }
        } else {
          setUser(null);
          setIsAuthenticated(false);
        }
      } catch (error) {
        console.error("Erro ao inicializar autenticação:", error);
        setUser(null);
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const updateAuthState = (newUser: User | null, token: string | null) => {
    setUser(newUser);
    setIsAuthenticated(!!newUser && !!token);
  };

  const clearAuthState = () => {
    setUser(null);
    setIsAuthenticated(false);
  };

  return {
    user,
    isAuthenticated,
    isLoading,
    updateAuthState,
    clearAuthState,
  };
}