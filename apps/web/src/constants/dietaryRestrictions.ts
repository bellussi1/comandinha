export const DIETARY_RESTRICTIONS_CONFIG = {
  "vegetariano": { emoji: "🥬", label: "Veg", nome: "Vegetariano" },
  "vegano": { emoji: "🌱", label: "Vegano", nome: "Vegano" },
  "sem glúten": { emoji: "🌾", label: "S/G", nome: "Sem Glúten" },
  "sem lactose": { emoji: "🥛", label: "S/L", nome: "Sem Lactose" },
  "apimentado": { emoji: "🌶️", label: "Apim", nome: "Apimentado" },
  "orgânico": { emoji: "🌿", label: "Org", nome: "Orgânico" },
} as const;

export type DietaryRestriction = keyof typeof DIETARY_RESTRICTIONS_CONFIG;