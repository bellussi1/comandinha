import type { ThemePreset } from "@/src/types";

export const THEME_PRESETS: ThemePreset[] = [
  {
    name: "Comandinha Original",
    description: "Tema padrão do sistema com cores vermelhas elegantes",
    preview: {
      primary: "#dc2626", // red-600
      secondary: "#f1f5f9", // slate-100  
      background: "#ffffff"
    },
    theme: {
      name: "Comandinha Original",
      light: {
        primary: "346.8 77.2% 49.8%", // Original red
        secondary: "210 40% 96.1%",
        accent: "210 40% 96.1%", 
        destructive: "0 84.2% 60.2%",
        background: "0 0% 100%",
        foreground: "222.2 84% 4.9%",
        card: "0 0% 100%",
        cardForeground: "222.2 84% 4.9%",
        popover: "0 0% 100%",
        popoverForeground: "222.2 84% 4.9%",
        muted: "210 40% 96.1%",
        mutedForeground: "215.4 16.3% 46.9%",
        border: "214.3 31.8% 91.4%",
        input: "214.3 31.8% 91.4%",
        ring: "346.8 77.2% 49.8%",
        radius: "0.5rem"
      },
      dark: {
        primary: "346.8 77.2% 49.8%",
        secondary: "217.2 32.6% 17.5%",
        accent: "217.2 32.6% 17.5%",
        destructive: "0 62.8% 30.6%",
        background: "222.2 84% 4.9%",
        foreground: "210 40% 98%",
        card: "222.2 84% 4.9%",
        cardForeground: "210 40% 98%",
        popover: "222.2 84% 4.9%",
        popoverForeground: "210 40% 98%",
        muted: "217.2 32.6% 17.5%",
        mutedForeground: "215 20.2% 65.1%",
        border: "217.2 32.6% 17.5%",
        input: "217.2 32.6% 17.5%",
        ring: "346.8 77.2% 49.8%",
        radius: "0.5rem"
      }
    }
  },
  
  {
    name: "Azul Oceano",
    description: "Tema azul profissional inspirado no oceano",
    preview: {
      primary: "#0ea5e9", // sky-500
      secondary: "#f0f9ff", // sky-50
      background: "#ffffff"
    },
    theme: {
      name: "Azul Oceano",
      light: {
        primary: "200.1 98% 39.4%", // blue-500
        secondary: "204 94% 94%", // blue-50
        accent: "204 94% 94%",
        destructive: "0 84.2% 60.2%",
        background: "0 0% 100%",
        foreground: "222.2 84% 4.9%",
        card: "0 0% 100%",
        cardForeground: "222.2 84% 4.9%",
        popover: "0 0% 100%",
        popoverForeground: "222.2 84% 4.9%",
        muted: "204 94% 94%",
        mutedForeground: "215.4 16.3% 46.9%",
        border: "204 93% 87%",
        input: "204 93% 87%", 
        ring: "200.1 98% 39.4%",
        radius: "0.5rem"
      },
      dark: {
        primary: "200.1 98% 39.4%",
        secondary: "215 28% 17%", // blue-900
        accent: "215 28% 17%",
        destructive: "0 62.8% 30.6%",
        background: "222.2 84% 4.9%",
        foreground: "210 40% 98%",
        card: "222.2 84% 4.9%",
        cardForeground: "210 40% 98%",
        popover: "222.2 84% 4.9%",
        popoverForeground: "210 40% 98%",
        muted: "215 28% 17%",
        mutedForeground: "215 20.2% 65.1%",
        border: "215 28% 17%",
        input: "215 28% 17%",
        ring: "200.1 98% 39.4%",
        radius: "0.5rem"
      }
    }
  },

  {
    name: "Verde Natural",
    description: "Tema verde eco-friendly para um visual natural",
    preview: {
      primary: "#10b981", // emerald-500
      secondary: "#ecfdf5", // emerald-50
      background: "#ffffff"
    },
    theme: {
      name: "Verde Natural", 
      light: {
        primary: "158.1 64.4% 51.6%", // emerald-500
        secondary: "151 81% 95.9%", // emerald-50
        accent: "151 81% 95.9%",
        destructive: "0 84.2% 60.2%",
        background: "0 0% 100%",
        foreground: "222.2 84% 4.9%",
        card: "0 0% 100%",
        cardForeground: "222.2 84% 4.9%",
        popover: "0 0% 100%",
        popoverForeground: "222.2 84% 4.9%",
        muted: "151 81% 95.9%",
        mutedForeground: "215.4 16.3% 46.9%",
        border: "151 77% 87%",
        input: "151 77% 87%",
        ring: "158.1 64.4% 51.6%",
        radius: "0.5rem"
      },
      dark: {
        primary: "158.1 64.4% 51.6%",
        secondary: "151 48% 11%", // emerald-950
        accent: "151 48% 11%",
        destructive: "0 62.8% 30.6%",
        background: "222.2 84% 4.9%",
        foreground: "210 40% 98%",
        card: "222.2 84% 4.9%",
        cardForeground: "210 40% 98%",
        popover: "222.2 84% 4.9%",
        popoverForeground: "210 40% 98%",
        muted: "151 48% 11%",
        mutedForeground: "215 20.2% 65.1%",
        border: "151 48% 11%",
        input: "151 48% 11%",
        ring: "158.1 64.4% 51.6%",
        radius: "0.5rem"
      }
    }
  },

  {
    name: "Laranja Vibrante",
    description: "Tema laranja energético para restaurantes dinâmicos",
    preview: {
      primary: "#f97316", // orange-500
      secondary: "#fff7ed", // orange-50
      background: "#ffffff"
    },
    theme: {
      name: "Laranja Vibrante",
      light: {
        primary: "20.5 90.2% 48.2%", // orange-500
        secondary: "33 100% 96.5%", // orange-50
        accent: "33 100% 96.5%",
        destructive: "0 84.2% 60.2%",
        background: "0 0% 100%",
        foreground: "222.2 84% 4.9%",
        card: "0 0% 100%",
        cardForeground: "222.2 84% 4.9%",
        popover: "0 0% 100%",
        popoverForeground: "222.2 84% 4.9%",
        muted: "33 100% 96.5%",
        mutedForeground: "215.4 16.3% 46.9%",
        border: "32 98% 87%",
        input: "32 98% 87%",
        ring: "20.5 90.2% 48.2%",
        radius: "0.5rem"
      },
      dark: {
        primary: "20.5 90.2% 48.2%",
        secondary: "24 45% 11%", // orange-950
        accent: "24 45% 11%",
        destructive: "0 62.8% 30.6%",
        background: "222.2 84% 4.9%",
        foreground: "210 40% 98%",
        card: "222.2 84% 4.9%",
        cardForeground: "210 40% 98%",
        popover: "222.2 84% 4.9%",
        popoverForeground: "210 40% 98%",
        muted: "24 45% 11%",
        mutedForeground: "215 20.2% 65.1%",
        border: "24 45% 11%",
        input: "24 45% 11%",
        ring: "20.5 90.2% 48.2%",
        radius: "0.5rem"
      }
    }
  },

  {
    name: "Roxo Elegante",
    description: "Tema roxo sofisticado para um toque premium",
    preview: {
      primary: "#8b5cf6", // violet-500
      secondary: "#faf5ff", // violet-50
      background: "#ffffff"
    },
    theme: {
      name: "Roxo Elegante",
      light: {
        primary: "258.3 89.5% 66.3%", // violet-500
        secondary: "270 100% 98%", // violet-50
        accent: "270 100% 98%",
        destructive: "0 84.2% 60.2%",
        background: "0 0% 100%",
        foreground: "222.2 84% 4.9%",
        card: "0 0% 100%",
        cardForeground: "222.2 84% 4.9%",
        popover: "0 0% 100%",
        popoverForeground: "222.2 84% 4.9%",
        muted: "270 100% 98%",
        mutedForeground: "215.4 16.3% 46.9%",
        border: "269 100% 92%",
        input: "269 100% 92%",
        ring: "258.3 89.5% 66.3%",
        radius: "0.5rem"
      },
      dark: {
        primary: "258.3 89.5% 66.3%",
        secondary: "248 39% 12%", // violet-950
        accent: "248 39% 12%",
        destructive: "0 62.8% 30.6%",
        background: "222.2 84% 4.9%",
        foreground: "210 40% 98%",
        card: "222.2 84% 4.9%",
        cardForeground: "210 40% 98%",
        popover: "222.2 84% 4.9%",
        popoverForeground: "210 40% 98%",
        muted: "248 39% 12%",
        mutedForeground: "215 20.2% 65.1%",
        border: "248 39% 12%",
        input: "248 39% 12%",
        ring: "258.3 89.5% 66.3%",
        radius: "0.5rem"
      }
    }
  }
];