export const STORAGE_KEYS = {
  TOKEN_PREFIX: "@comandinha:token:",
  CARRINHO_PREFIX: "@comandinha:carrinho:",
  AUTH_TOKEN: "@comandinha:auth_token",
  USER_DATA: "@comandinha:user_data",
};

export const STATUS = {
  CONFIRMADO: "confirmado",
  PREPARANDO: "preparando", 
  PRONTO: "pronto",
  ENTREGUE: "entregue",
};

export const API_ENDPOINTS = {
  MESAS: "/mesas",
  PEDIDOS: "/pedidos",
  PRODUTOS: "/produtos",
  CATEGORIAS: "/categorias",
  ADMIN: "/admin",
  AUTH: {
    LOGIN: "/auth/login",
    REGISTER: "/auth/register",
    VALIDATE: "/auth/validate",
    ME: "/admin/me",
  },
};

export const STATUS_COLORS = {
  CONFIRMADO: "bg-blue-500",
  PREPARANDO: "bg-orange-500",
  PRONTO: "bg-green-500",
  ENTREGUE: "bg-slate-500",
}; 