import api from "./api";
import { API_ENDPOINTS, STORAGE_KEYS } from "@/src/constants";
import type { 
  LoginCredentials, 
  RegisterData, 
  AuthResponse, 
  User 
} from "@/src/types/auth";

/**
 * Classe para gerenciar autenticação de admin
 */
export class AuthService {
  /**
   * Faz login de admin
   */
static async login(credentials: LoginCredentials): Promise<AuthResponse> {
  try {
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

    return { token, user };
  } catch (error) {
    console.error("Erro no login:", error);
    throw new Error("Credenciais inválidas");
  }
}

static async register(data: RegisterData): Promise<AuthResponse> {
  try {
    // 1. Criar usuário
    await api.post(API_ENDPOINTS.AUTH.REGISTER, {
      nome: data.nome,
      email: data.email,
      senha: data.senha,
    });

    // 2. Depois do registro, fazer login automático
    return await this.login({
      email: data.email,
      senha: data.senha,
    });
  } catch (error) {
    console.error("Erro no registro:", error);
    throw new Error("Falha ao criar conta");
  }
}


  /**
   * Faz logout
   */
  static logout(): void {
    if (typeof window === "undefined") return;
    
    localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.USER_DATA);
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
  }
}

/**
 * Hook personalizado para autenticação
 */
export const useAuth = () => {
  const isAuthenticated = AuthService.isAuthenticated();
  const user = AuthService.getCurrentUser();
  const token = AuthService.getToken();

  return {
    user,
    token,
    isAuthenticated,
    login: AuthService.login,
    register: AuthService.register,
    logout: AuthService.logout,
    validateToken: AuthService.validateToken,
  };
};