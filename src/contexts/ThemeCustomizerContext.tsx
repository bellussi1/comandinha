"use client";

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { useToast } from "@/src/components/ui/use-toast";
import { getTemaAtivo, atualizarCoresTema, ativarTema, criarTema } from "@/src/services/tema";
import type { CustomTheme, ThemeColors } from "@/src/types";

interface ThemeCustomizerContextType {
  // Estado atual
  currentTheme: CustomTheme | null;
  loading: boolean;
  
  // Funções de manipulação
  updateThemeColors: (mode: 'light' | 'dark', colors: Partial<ThemeColors>) => Promise<void>;
  activateTheme: (themeId: string) => Promise<void>;
  createTheme: (theme: Omit<CustomTheme, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  refreshTheme: () => Promise<void>;
  
  // Aplicação das cores
  applyThemeColors: (theme: CustomTheme, mode: 'light' | 'dark') => void;
}

const ThemeCustomizerContext = createContext<ThemeCustomizerContextType | undefined>(undefined);

export function useThemeCustomizer() {
  const context = useContext(ThemeCustomizerContext);
  if (context === undefined) {
    throw new Error('useThemeCustomizer must be used within a ThemeCustomizerProvider');
  }
  return context;
}

interface ThemeCustomizerProviderProps {
  children: ReactNode;
}

export function ThemeCustomizerProvider({ children }: ThemeCustomizerProviderProps) {
  const [currentTheme, setCurrentTheme] = useState<CustomTheme | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Aplica as cores do tema ao CSS
  const applyThemeColors = (theme: CustomTheme, mode: 'light' | 'dark') => {
    const colors = mode === 'light' ? theme.light : theme.dark;
    const root = document.documentElement;
    
    // Remove classes de tema anteriores
    root.classList.remove('light', 'dark');
    
    // Define CSS custom properties
    Object.entries(colors).forEach(([key, value]) => {
      const cssKey = key.replace(/([A-Z])/g, '-$1').toLowerCase();
      root.style.setProperty(`--${cssKey}`, value);
    });
  };

  // Carrega tema ativo do servidor
  const loadActiveTheme = useCallback(async () => {
    try {
      setLoading(true);
      const theme = await getTemaAtivo();
      
      if (theme) {
        setCurrentTheme(theme);
        
        // Aplica o tema baseado no modo atual do sistema
        const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const currentMode = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
        
        applyThemeColors(theme, currentMode as 'light' | 'dark');
      }
    } catch (error) {
      console.error('Erro ao carregar tema ativo:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar o tema personalizado.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Atualiza cores de um tema
  const updateThemeColors = async (mode: 'light' | 'dark', colors: Partial<ThemeColors>) => {
    if (!currentTheme?.id) {
      toast({
        title: "Erro",
        description: "Nenhum tema ativo para atualizar.",
        variant: "destructive",
      });
      return;
    }

    try {
      const updatedTheme = await atualizarCoresTema(currentTheme.id, mode, colors);
      
      if (updatedTheme) {
        setCurrentTheme(updatedTheme);
        
        // Aplica as cores imediatamente se for o modo atual
        const currentMode = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
        if (mode === currentMode) {
          applyThemeColors(updatedTheme, mode);
        }
        
        toast({
          title: "Sucesso",
          description: `Cores do modo ${mode === 'light' ? 'claro' : 'escuro'} atualizadas!`,
        });
      }
    } catch (error) {
      console.error('Erro ao atualizar cores:', error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar as cores do tema.",
        variant: "destructive",
      });
    }
  };

  // Ativa um tema específico
  const activateTheme = async (themeId: string) => {
    try {
      const activatedTheme = await ativarTema(themeId);
      
      if (activatedTheme) {
        setCurrentTheme(activatedTheme);
        
        // Aplica o tema ativo
        const currentMode = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
        applyThemeColors(activatedTheme, currentMode);
        
        toast({
          title: "Sucesso",
          description: `Tema "${activatedTheme.name}" ativado!`,
        });
      }
    } catch (error) {
      console.error('Erro ao ativar tema:', error);
      toast({
        title: "Erro",
        description: "Não foi possível ativar o tema.",
        variant: "destructive",
      });
    }
  };

  // Cria um novo tema
  const createTheme = async (theme: Omit<CustomTheme, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const newTheme = await criarTema(theme);
      
      if (newTheme && theme.isActive) {
        setCurrentTheme(newTheme);
        
        // Se o novo tema for ativo, aplica imediatamente
        const currentMode = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
        applyThemeColors(newTheme, currentMode);
      }
      
      toast({
        title: "Sucesso",
        description: `Tema "${theme.name}" criado com sucesso!`,
      });
    } catch (error) {
      console.error('Erro ao criar tema:', error);
      toast({
        title: "Erro",
        description: "Não foi possível criar o tema.",
        variant: "destructive",
      });
      throw error;
    }
  };

  // Recarrega tema do servidor
  const refreshTheme = async () => {
    await loadActiveTheme();
  };

  // Monitora mudanças de dark/light mode para aplicar cores corretas
  useEffect(() => {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
          if (currentTheme) {
            const isDark = document.documentElement.classList.contains('dark');
            applyThemeColors(currentTheme, isDark ? 'dark' : 'light');
          }
        }
      });
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });

    return () => observer.disconnect();
  }, [currentTheme]);

  // Carrega tema inicial
  useEffect(() => {
    loadActiveTheme();
  }, [loadActiveTheme]);

  const value: ThemeCustomizerContextType = {
    currentTheme,
    loading,
    updateThemeColors,
    activateTheme,
    createTheme,
    refreshTheme,
    applyThemeColors,
  };

  return (
    <ThemeCustomizerContext.Provider value={value}>
      {children}
    </ThemeCustomizerContext.Provider>
  );
}