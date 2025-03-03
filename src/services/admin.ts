import type { Admin } from "../types";

const ADMINS_MOCK: Admin[] = [
  {
    id: "1",
    nome: "João Silva",
    email: "joao@restaurante.com",
    cargo: "gerente",
    permissoes: [
      "gerenciar_mesas",
      "gerenciar_pedidos",
      "gerenciar_usuarios",
      "gerenciar_cardapio",
    ],
  },
  {
    id: "2",
    nome: "Maria Santos",
    email: "maria@restaurante.com",
    cargo: "garcom",
    permissoes: ["gerenciar_mesas", "gerenciar_pedidos"],
  },
  {
    id: "3",
    nome: "Pedro Costa",
    email: "pedro@restaurante.com",
    cargo: "cozinheiro",
    permissoes: ["gerenciar_pedidos"],
  },
];

export const getAdmins = () => {
  return ADMINS_MOCK;
};

export const getAdminById = (id: string) => {
  return ADMINS_MOCK.find((admin) => admin.id === id);
};

export const verificarPermissao = (adminId: string, permissao: string) => {
  const admin = getAdminById(adminId);
  return admin?.permissoes.includes(permissao) || false;
};
