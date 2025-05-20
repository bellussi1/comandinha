import api from "./api";

const TOKEN_PREFIX = "@comandinha:token:";

interface MesaAtivacaoResponse {
  token: string;
  expiraEm: string;
  mesaId: string;
  mesaNome: string;
}

export const ativarMesa = async (
  mesaId: string
): Promise<MesaAtivacaoResponse> => {
  try {
    const response = await api.post("/mesas/ativar", { mesaId });
    const data = response.data;

    // Salvar token no localStorage
    if (typeof window !== "undefined") {
      localStorage.setItem(`${TOKEN_PREFIX}${mesaId}`, data.token);
    }

    return data;
  } catch (error) {
    console.error("Erro ao ativar mesa:", error);
    throw new Error("Não foi possível ativar a mesa");
  }
};

export const validarToken = async (mesaId: string): Promise<boolean> => {
  try {
    console.log(`Tentando validar mesa: ${mesaId}`); // Log para debug

    // Verificar se já existe um token salvo para esta mesa
    const tokenSalvo = localStorage.getItem(`@comandinha:token:${mesaId}`);

    if (tokenSalvo) {
      console.log("Token encontrado no localStorage");
      try {
        // Tentar validar usando o endpoint de validação real
        const validacaoResponse = await api.get("/mesas/validar", {
          headers: { Authorization: `Bearer ${tokenSalvo}` },
        });

        console.log("Resposta de validação:", validacaoResponse.data);
        return validacaoResponse.data.valido;
      } catch (validacaoError) {
        console.log("Erro na validação com token salvo:", validacaoError);
        // Se falhar, prosseguimos para tentar ativar
      }
    }

    // Se não temos token ou validação falhou, tentar ativar a mesa
    try {
      console.log("Tentando ativar a mesa");
      const ativacaoResponse = await api.post("/mesas/ativar", { mesaId });

      // Se a ativação for bem-sucedida, salvar o token e retornar válido
      if (ativacaoResponse.data && ativacaoResponse.data.token) {
        localStorage.setItem(
          `@comandinha:token:${mesaId}`,
          ativacaoResponse.data.token
        );
        console.log("Mesa ativada com sucesso");
        return true;
      }
    } catch (ativacaoError) {
      console.log("Erro ao ativar mesa:", ativacaoError);
    }

    // Se chegamos aqui, tentar uma última verificação simples
    try {
      // Verificar apenas se a mesa existe usando uma listagem
      const listResponse = await api.get("/mesas");
      const mesas = listResponse.data;

      // Verificar se o ID está na lista
      const mesaExiste = mesas.some(
        (mesa: any) =>
          mesa.id.toString() === mesaId.toString() || mesa.nome === mesaId
      );

      console.log(`Mesa ${mesaId} existe na listagem: ${mesaExiste}`);
      return mesaExiste;
    } catch (listError) {
      console.log("Erro ao listar mesas:", listError);
    }

    // Se todas as tentativas falharam, a mesa é inválida
    return false;
  } catch (error) {
    console.error("Erro geral ao validar mesa:", error);
    return false;
  }
};

export const refreshToken = async (
  mesaId: string
): Promise<MesaAtivacaoResponse | null> => {
  try {
    const response = await api.post(`/mesas/${mesaId}/refresh`);
    const data = response.data;

    // Atualizar token no localStorage
    localStorage.setItem(`${TOKEN_PREFIX}${mesaId}`, data.token);

    return data;
  } catch (error) {
    console.error("Erro ao atualizar token:", error);
    return null;
  }
};

export const fecharConta = async (mesaId: string, formaPagamento: string) => {
  try {
    const response = await api.post(`/mesas/${mesaId}/fechar`, {
      formaPagamento,
    });

    // Remover token após fechar a conta
    localStorage.removeItem(`${TOKEN_PREFIX}${mesaId}`);

    return response.data;
  } catch (error) {
    console.error("Erro ao fechar conta:", error);
    throw new Error("Não foi possível fechar a conta");
  }
};
