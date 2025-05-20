import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { ativarMesa, validarToken, refreshToken } from "../services/mesa";

export function useAuth() {
  const router = useRouter();
  const { token } = router.query; // mesaId ou token que vem da URL
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [mesaId, setMesaId] = useState<string | null>(null);

  useEffect(() => {
    const verificarAutenticacao = async () => {
      if (!token || typeof token !== "string") {
        setLoading(false);
        return;
      }

      try {
        // Tenta validar o token atual
        const tokenValido = await validarToken(token);

        if (tokenValido) {
          setIsAuthenticated(true);
          setMesaId(token);
        } else {
          // Se o token não for válido, tenta ativar a mesa
          const ativacao = await ativarMesa(token);
          if (ativacao) {
            setIsAuthenticated(true);
            setMesaId(ativacao.mesaId);
          }
        }
      } catch (error) {
        console.error("Erro ao autenticar mesa:", error);
      } finally {
        setLoading(false);
      }
    };

    verificarAutenticacao();
  }, [token]);

  const atualizarToken = async () => {
    if (!mesaId) return false;

    try {
      const atualizacao = await refreshToken(mesaId);
      return !!atualizacao;
    } catch (error) {
      return false;
    }
  };

  return { isAuthenticated, loading, mesaId, atualizarToken };
}
