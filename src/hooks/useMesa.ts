import { useState, useEffect } from "react";
import api from "../services/api";
import { Mesa } from "../types";
import { useRouter } from "next/router";

export function useMesa() {
  const [mesa, setMesa] = useState<Mesa | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { token } = router.query;

  useEffect(() => {
    const buscarMesa = async () => {
      if (!token || typeof token !== "string") {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const response = await api.get("/mesas/validar", {
          headers: {
            Authorization: `Bearer ${localStorage.getItem(
              `@comandinha:token:${token}`
            )}`,
          },
        });

        if (response.data.valido) {
          // Buscar detalhes da mesa
          const mesaResponse = await api.get(`/mesas/${response.data.mesaId}`);
          setMesa(mesaResponse.data);
        } else {
          setError("Mesa não encontrada ou token inválido");
          router.push("/");
        }
      } catch (error) {
        console.error("Erro ao buscar mesa:", error);
        setError("Erro ao buscar informações da mesa");
      } finally {
        setLoading(false);
      }
    };

    buscarMesa();
  }, [token, router]);

  return { mesa, loading, error };
}
