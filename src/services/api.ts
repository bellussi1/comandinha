import axios from "axios";
import { TokenManager } from "./tokenManager";
import { API_ENDPOINTS } from "../constants";

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
    // Extrair ID da mesa da URL de forma mais robusta
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
  return config;
});

export default api;
