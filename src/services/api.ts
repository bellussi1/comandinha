import axios from "axios";
import { TokenManager } from "./tokenManager";
import { STORAGE_KEYS, API_ENDPOINTS } from "../constants";

const baseURL =
  process.env.NEXT_PUBLIC_API_URL || "https://comandinha.onrender.com";

const api = axios.create({
  baseURL: baseURL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Interceptor aprimorado para autenticação
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    // Verificar se é uma rota de autenticação admin
    const isAuthRoute = config.url?.includes("/auth/");
    const isAdminRoute = config.url?.includes("admin") || 
                        config.url?.includes("/pedidos/producao") ||
                        config.url?.includes("/categorias") ||
                        config.url?.includes("/produtos");
    
    if (isAdminRoute && !isAuthRoute) {
      // Para rotas admin, usar token de admin
      const adminToken = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
      if (adminToken) {
        config.headers.Authorization = adminToken; // Já inclui "Bearer "
      }
    } else {
      // Para rotas de mesa, usar token da mesa
      const urlParts = config.url?.split("/") || [];
      let mesaId = null;
      
      // Verificar padrão /mesas/{id}
      for (let i = 0; i < urlParts.length; i++) {
        if (urlParts[i] === "mesas" && i + 1 < urlParts.length) {
          const potentialId = urlParts[i + 1].split("?")[0];
          if (potentialId) {
            mesaId = potentialId;
            break;
          }
        }
      }

      if (mesaId) {
        const token = TokenManager.getToken(mesaId);
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      }
    }
  }
  return config;
});

export default api;
