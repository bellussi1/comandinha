export const STORAGE_KEYS = {
  TOKEN_PREFIX: "@comandinha:token:",
  CARRINHO_PREFIX: "@comandinha:carrinho:",
  AUTH_TOKEN: "@comandinha:auth_token",
  USER_DATA: "@comandinha:user_data",
};

export const STATUS = {
  PENDENTE: "pendente",
  EM_PREPARO: "em preparo",
  ENTREGUE: "entregue",
  CONCLUIDO: "concluido", // Sem acento, como na API
};

// IDs dos status para a nova API
export const STATUS_IDS = {
  PENDENTE: 1,
  EM_PREPARO: 2,
  ENTREGUE: 3,
  CONCLUIDO: 4,
};

// Mapeamento bidirecional para facilitar conversões
export const STATUS_ID_TO_STRING: Record<number, string> = {
  1: "pendente",
  2: "em preparo",
  3: "entregue",
  4: "concluido",
};

export const STATUS_STRING_TO_ID: Record<string, number> = {
  "pendente": 1,
  "em preparo": 2,
  "entregue": 3,
  "concluido": 4,
};

export const API_ENDPOINTS = {
  MESAS: "/mesas",
  PEDIDOS: "/pedidos",
  PRODUTOS: "/produtos",
  CATEGORIAS: "/categorias",
  AUTH: {
    LOGIN: "/auth/login",
    REGISTER: "/auth/register",
    VALIDATE: "/auth/validate",
    ME: "/admin/me",
  },
};

export const STATUS_COLORS = {
  PENDENTE: "bg-blue-500",
  EM_PREPARO: "bg-orange-500",
  ENTREGUE: "bg-green-500",
  CONCLUIDO: "bg-slate-500",
};

// Cores por string de status para facilitar uso
export const STATUS_COLORS_BY_STRING: Record<string, string> = {
  "pendente": "bg-blue-500 text-white",
  "em preparo": "bg-orange-500 text-white",
  "entregue": "bg-green-500 text-white",
  "concluido": "bg-slate-500 text-white",
}; 