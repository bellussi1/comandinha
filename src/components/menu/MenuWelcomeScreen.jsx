import { ArrowRight } from "lucide-react";

export const MenuWelcomeScreen = ({ onContinue }) => (
  <div className="min-h-screen bg-gradient-to-b from-green-500 to-green-600 flex flex-col items-center justify-center p-6 text-white">
    <h1 className="text-4xl font-bold mb-4 text-center">Bem-vindo ao</h1>
    <h2 className="text-3xl font-bold mb-8 text-center">
      Barão Bar e Restaurante
    </h2>

    <div className="text-center mb-8">
      <p className="text-xl mb-4">Faça seu pedido de forma rápida e fácil</p>
      <p className="text-lg">
        Escolha seus pratos favoritos e nós prepararemos com todo carinho
      </p>
    </div>

    <button
      onClick={onContinue}
      className="flex items-center gap-2 bg-white text-green-600 px-8 py-4 rounded-full font-bold text-lg hover:bg-green-50 transition-colors"
    >
      Fazer Pedido
      <ArrowRight />
    </button>
  </div>
);
