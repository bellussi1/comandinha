"use client";

import { useState, useCallback } from "react";

interface UseFormSubmitOptions<T> {
  onSubmit: (data: T) => Promise<void>;
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

/**
 * Hook para gerenciar estado de submissão de formulários
 */
export function useFormSubmit<T>({
  onSubmit,
  onSuccess,
  onError,
}: UseFormSubmitOptions<T>) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = useCallback(
    async (data: T) => {
      try {
        setIsLoading(true);
        setError(null);

        await onSubmit(data);
        
        onSuccess?.();
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Erro desconhecido";
        setError(errorMessage);
        onError?.(errorMessage);
      } finally {
        setIsLoading(false);
      }
    },
    [onSubmit, onSuccess, onError]
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    isLoading,
    error,
    handleSubmit,
    clearError,
  };
}