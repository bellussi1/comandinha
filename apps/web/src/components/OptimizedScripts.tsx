"use client";

import { useEffect } from 'react';

export function OptimizedScripts() {
  useEffect(() => {
    // Usar requestIdleCallback para operações não críticas
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => {
        // Pré-carregar recursos durante tempo ocioso
        const link = document.createElement('link');
        link.rel = 'prefetch';
        link.as = 'image';
        document.head.appendChild(link);
      }, { timeout: 3000 });
    }

    // Quebrar tarefas longas em chunks menores
    const scheduleWork = (callback: () => void) => {
      if ('scheduler' in window && 'yield' in (window as any).scheduler) {
        return (window as any).scheduler.yield().then(callback);
      }
      return Promise.resolve().then(callback);
    };

    // Exemplo de uso: pode ser usado para processamento pesado
    (window as any).__scheduleWork = scheduleWork;
  }, []);

  return null;
}
