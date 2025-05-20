// hooks/useApi.ts
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import api from "../services/api";

export function useApi<T>(endpoint: string, options = {}) {
  const router = useRouter();
  const { mesa } = router.query;

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!mesa) return;

      try {
        setLoading(true);
        const response = await api.get(
          `${endpoint}${endpoint.includes("?") ? "&" : "?"}mesa=${mesa}`
        );
        setData(response.data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Erro desconhecido"));
        console.error(`Erro ao buscar ${endpoint}:`, err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [endpoint, mesa]);

  return { data, loading, error };
}
