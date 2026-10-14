import axios, { AxiosError } from "axios";
import { TokenManager } from "./tokenManager";
import { STORAGE_KEYS, API_ENDPOINTS } from "../constants";
import { ErrorHandler } from "./errorHandler";

const baseURL =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://comandinha-backend-staging.onrender.com";

const api = axios.create({
  baseURL: baseURL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Interceptor aprimorado para autenticação
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const url = config.url || "";
    const method = config.method?.toLowerCase() || "get";

    // Função helper para verificar se é rota admin protegida
    const isAdminProtectedRoute = () => {
      // CRUD básico de mesas (admin protegido)
      if (url === "/mesas" && (method === "get" || method === "post"))
        return true;
      if (/^\/mesas\/\d+$/.test(url) && method === "delete") return true;
      if (/^\/mesas\/\d+\/encerrar$/.test(url) && method === "post")
        return true;
      if (/^\/mesas\/\d+\/desativar$/.test(url) && method === "post")
        return true;
      if (/^\/mesas\/\d+\/fechar$/.test(url) && method === "post") return true;

      // Endpoints de pedidos (admin protegido)
      if (url === "/pedidos" && method === "get") return true; // Lista todos os pedidos ativos
      if (
        /^\/pedidos\/\d+\/status$/.test(url) &&
        (method === "patch" || method === "put")
      )
        return true;
      if (url.includes("/pedidos/producao")) return true;

      // Endpoints de chamados (admin protegido para listagem e atender)
      if (url.startsWith("/chamadas/historico") && method === "get")
        return true;
      if (url.startsWith("/chamadas/pendentes") && method === "get")
        return true;
      if (/^\/chamadas\/\d+\/atender/.test(url) && method === "patch")
        return true;

      // Endpoints de mesas específicas (admin protegido para fechamento)
      if (/^\/mesas\/\d+\/pedidos$/.test(url) && method === "get") return true; // Lista pedidos de uma mesa específica
      if (/^\/mesas\/\d+\/status$/.test(url) && method === "get") return true; // Status da mesa

      // Outras rotas admin existentes
      if (url.includes("admin") && !url.includes("/auth/")) return true;
      if (url.includes("/categorias")) return true;
      if (url.includes("/produtos")) return true;

      return false;
    };

    // Função helper para verificar se é rota de mesa protegida
    const isMesaProtectedRoute = () => {
      if (url === "/mesas/validar") return true;
      if (/^\/mesas\/\d+\/refresh$/.test(url)) return true;
      // Nota: /mesas/{id}/status e /mesas/{id}/pedidos foram movidos para admin protegido
      return false;
    };

    // Função helper para verificar se é rota pública ou de mesa (sem admin)
    const isPublicRoute = () => {
      if (url === "/mesas/ativar" && method === "post") return true;
      if (/^\/mesas\/uuid\/[^\/]+$/.test(url)) return true;
      if (/^\/mesas\/uuid\/[^\/]+\/ativar$/.test(url)) return true;
      if (/^\/mesas\/uuid\/[^\/]+\/validar$/.test(url)) return true;
      if (url.includes("/auth/")) return true;

      // Endpoints de chamados que usam mesa_uuid (não admin)
      if (url === "/chamadas" && method === "post") return true; // Criar chamado
      if (/^\/chamadas\/\d+\/cancelar$/.test(url) && method === "patch")
        return true; // Cancelar chamado
      if (/^\/mesas\/uuid\/[^\/]+\/chamadas$/.test(url) && method === "get")
        return true; // Histórico da mesa

      return false;
    };

    // Se é rota pública, não adicionar token
    if (isPublicRoute()) {
      return config;
    }

    // Se é rota admin protegida, usar token admin
    if (isAdminProtectedRoute()) {
      const adminToken = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
      if (adminToken) {
        config.headers.Authorization = adminToken; // Já inclui "Bearer "
      }
      return config;
    }

    // Se é rota de mesa protegida, usar token da mesa
    if (isMesaProtectedRoute()) {
      // Extrair mesa ID da URL se possível
      const mesaIdMatch = url.match(/\/mesas\/(\d+)/);
      if (mesaIdMatch) {
        const mesaId = mesaIdMatch[1];
        const token = TokenManager.getToken(mesaId);
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      }
      // Para /mesas/validar, usar o token passado no contexto customizado
      else if (url === "/mesas/validar") {
        // Verificar se há um mesaId especificado nas configurações customizadas
        const mesaId = (config as any).__mesaId;
        if (mesaId) {
          const token = TokenManager.getToken(mesaId);
          if (token) {
            config.headers.Authorization = `Bearer ${token}`;
          }
        } else {
          // Se não há contexto específico, tentar usar qualquer token disponível
          const tokens = TokenManager.getAllTokens();
          const firstToken = Object.values(tokens)[0];
          if (firstToken) {
            config.headers.Authorization = `Bearer ${firstToken}`;
          }
        }
      }
      return config;
    }
  }
  return config;
});

// Interceptor de resposta para tratamento padronizado de erros
api.interceptors.response.use(
  (response) => {
    // Resposta bem-sucedida - retornar dados diretamente
    return response;
  },
  (error: AxiosError) => {
    // Criar contexto do erro
    const context = {
      url: error.config?.url,
      method: error.config?.method,
    };

    // Processar erro com handler padronizado
    const appError = ErrorHandler.handleAxiosError(error, context);

    // Log do erro
    ErrorHandler.logError(appError, {
      logError: true,
      showToast: false, // Componentes decidem se mostram toast
    });

    // Para erros de autenticação, limpar tokens inválidos
    if (appError.type === "AUTHENTICATION" && typeof window !== "undefined") {
      if (error.config?.url?.includes("admin")) {
        localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
        localStorage.removeItem(STORAGE_KEYS.USER_DATA);
      }
    }

    // Rejeitar com erro padronizado
    return Promise.reject(appError);
  }
);

export default api;
