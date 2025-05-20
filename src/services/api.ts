import axios from "axios";

const baseURL =
  process.env.NEXT_PUBLIC_API_URL || "https://comandinha.onrender.com";

const api = axios.create({
  baseURL: baseURL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Interceptor para adicionar o token de autenticação
api.interceptors.request.use((config) => {
  // Verifica se estamos no navegador e se há um token salvo
  if (typeof window !== "undefined") {
    const mesa = config.url?.includes("/mesas/")
      ? config.url.split("/mesas/")[1]?.split("/")[0]
      : null;

    if (mesa) {
      const token = localStorage.getItem(`@comandinha:token:${mesa}`);
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
  }
  return config;
});

export default api;
