"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import api from "./api";
import { API_ENDPOINTS, STORAGE_KEYS } from "@/src/constants";
import { ErrorHandler } from "./errorHandler";
import type { 
  LoginCredentials, 
  RegisterData, 
  AuthResponse, 
  User 
} from "@/src/types/auth";
import type { AppError, ServiceResponse } from "@/src/types/errors";

/**
 * Classe para gerenciar autenticação de admin
 */
export class AuthService {
  /**
   * Faz login de admin
   */
static async login(credentials: LoginCredentials): Promise<ServiceResponse<AuthResponse>> {
  try {
    // Backend faz hash internamente - enviar senha via HTTPS seguro
    const response = await api.post(API_ENDPOINTS.AUTH.LOGIN, {
      email: credentials.email,
      senha: credentials.senha,
    });

    const { access_token, token_type } = response.data;
    const token = `${token_type} ${access_token}`;

    // Buscar dados do usuário logado
    const userResponse = await api.get<User>(API_ENDPOINTS.AUTH.ME, {
      headers: { Authorization: token },
    });

    const user = userResponse.data;

    this.setAuthData(token, user);

    return ErrorHandler.createSuccessResponse(
      { token, user }, 
      'Login realizado com sucesso'
    );
  } catch (error) {
    // Error é automaticamente tratado pelo interceptor
    // Aqui só precisamos converter para ServiceResponse
    const appError = error as AppError;
    return ErrorHandler.createServiceResponse<AuthResponse>(appError);
  }
}

static async register(data: RegisterData): Promise<ServiceResponse<AuthResponse>> {
  try {
    // Backend faz hash internamente - enviar senha via HTTPS seguro
    await api.post(API_ENDPOINTS.AUTH.REGISTER, {
      nome: data.nome,
      email: data.email,
      senha: data.senha,
    });

    // Depois do registro, fazer login automático
    return await this.login({
      email: data.email,
      senha: data.senha,
    });
  } catch (error) {
    // Error é automaticamente tratado pelo interceptor
    const appError = error as AppError;
    return ErrorHandler.createServiceResponse<AuthResponse>(appError);
  }
}


  /**
   * Faz logout
   */
  static logout(): void {
    if (typeof window === "undefined") return;
    
    localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.USER_DATA);
    
    // Dispatch custom event to notify components of auth change
    window.dispatchEvent(new CustomEvent('auth-state-changed'));
  }

  /**
   * Verifica se está autenticado
   */
  static isAuthenticated(): boolean {
    if (typeof window === "undefined") return false;
    
    const token = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
    return !!token;
  }

  /**
   * Obtém token atual
   */
  static getToken(): string | null {
    if (typeof window === "undefined") return null;
    
    return localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
  }

  /**
   * Obtém dados do usuário atual
   */
  static getCurrentUser(): User | null {
    if (typeof window === "undefined") return null;
    
    const userData = localStorage.getItem(STORAGE_KEYS.USER_DATA);
    return userData ? JSON.parse(userData) : null;
  }

  /**
   * Valida token com o servidor
   */
 static async validateToken(): Promise<boolean> {
  try {
    const token = this.getToken();
    if (!token) return false;

    // Se conseguir buscar o usuário, o token é válido
    const response = await api.get<User>(API_ENDPOINTS.AUTH.ME, {
      headers: { Authorization: token },
    });

    return !!response.data;
  } catch (error) {
    console.error("Token inválido:", error);
    this.logout(); // Remove token inválido
    return false;
  }
}

  /**
   * Salva dados de autenticação no localStorage
   */
  private static setAuthData(token: string, user: User): void {
    if (typeof window === "undefined") return;
    
    localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
    localStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(user));
    
    // Dispatch custom event to notify components of auth change
    window.dispatchEvent(new CustomEvent('auth-state-changed'));
  }
}

/**
 * Hook personalizado para autenticação
 */
export const useAuth = () => {
  const [authState, setAuthState] = useState({
    isAuthenticated: false,
    user: null as User | null,
    token: null as string | null,
  });
  const [mounted, setMounted] = useState(false);

  const refreshAuthState = useCallback(() => {
    if (typeof window === 'undefined') return;
    
    const newAuthState = {
      isAuthenticated: AuthService.isAuthenticated(),
      user: AuthService.getCurrentUser(),
      token: AuthService.getToken(),
    };

    // Only update if state actually changed (prevents unnecessary re-renders)
    setAuthState(prevState => {
      if (prevState.isAuthenticated !== newAuthState.isAuthenticated ||
          prevState.token !== newAuthState.token ||
          JSON.stringify(prevState.user) !== JSON.stringify(newAuthState.user)) {
        return newAuthState;
      }
      return prevState;
    });
  }, []);

  useEffect(() => {
    setMounted(true);
    refreshAuthState();
    
    // Listen for storage changes to keep auth state in sync
    const handleStorageChange = () => {
      refreshAuthState();
    };
    
    // Custom event for same-tab auth changes
    const handleAuthChange = () => {
      refreshAuthState();
    };
    
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('auth-state-changed', handleAuthChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('auth-state-changed', handleAuthChange);
    };
  }, []);

  const login = useCallback(async (credentials: LoginCredentials) => {
    const result = await AuthService.login(credentials);
    
    if (result.success && result.data) {
      refreshAuthState(); // Refresh state after successful login
      return result.data; // Return the AuthResponse for backward compatibility
    } else {
      // Throw user-friendly error message
      throw new Error(result.error?.userMessage || 'Erro no login');
    }
  }, [refreshAuthState]);

  const register = useCallback(async (data: RegisterData) => {
    const result = await AuthService.register(data);
    
    if (result.success && result.data) {
      refreshAuthState(); // Refresh state after successful register
      return result.data; // Return the AuthResponse for backward compatibility
    } else {
      // Throw user-friendly error message
      throw new Error(result.error?.userMessage || 'Erro no registro');
    }
  }, [refreshAuthState]);

  const logout = useCallback(() => {
    AuthService.logout();
    refreshAuthState(); // Refresh state after logout
  }, [refreshAuthState]);

  // Memoize static methods to prevent re-creation
  const validateToken = useCallback(AuthService.validateToken, []);

  // Memoize return objects to prevent unnecessary re-renders
  const unmountedValue = useMemo(() => ({
    user: null,
    token: null,
    isAuthenticated: false,
    login,
    register,
    logout,
    validateToken,
    refreshAuthState,
  }), [login, register, logout, validateToken, refreshAuthState]);

  const mountedValue = useMemo(() => ({
    ...authState,
    login,
    register,
    logout,
    validateToken,
    refreshAuthState,
  }), [authState, login, register, logout, validateToken, refreshAuthState]);

  // Don't return auth state until component is mounted to avoid hydration issues
  if (!mounted) {
    return unmountedValue;
  }

  return mountedValue;
};