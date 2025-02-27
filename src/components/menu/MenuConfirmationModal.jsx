import { Check } from "lucide-react";

export const MenuConfirmationModal = ({ onClose }) => (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div className="bg-white rounded-lg p-8 flex flex-col items-center animate-bounce">
      <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mb-4">
        <Check className="text-white" size={32} />
      </div>
      <h2 className="text-2xl font-bold mb-2">Pedido Confirmado!</h2>
      <p className="text-gray-600">Seu pedido está sendo preparado</p>
    </div>
  </div>
);
