import { Roboto } from "next/font/google";

export const roboto = Roboto({
  subsets: ["latin"],
  weight: ["100", "300", "400", "500", "700", "900"], // Escolha os pesos desejados
  style: ["normal", "italic"], // Adicione estilos conforme necessário
  display: "swap",
  variable: "--font-roboto", // Para uso com variáveis CSS
});
