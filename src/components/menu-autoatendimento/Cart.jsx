import { Minus, Plus } from "lucide-react";

const Cart = ({ items, total, onRemoveItem, onAddItem, onCheckout }) => {
  if (items.length === 0) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white shadow-lg border-t p-4">
      <div className="max-h-40 overflow-y-auto mb-4">
        {items.map((item) => (
          <div key={item.id} className="flex justify-between items-center mb-2">
            <div className="flex-1">
              <h4 className="font-medium">{item.nome}</h4>
              <p className="text-sm text-gray-600">
                R$ {item.preco.toFixed(2)} x {item.quantidade}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => onRemoveItem(item)}
                className="p-1 bg-red-500 text-white rounded-full"
              >
                <Minus size={16} />
              </button>
              <span className="w-8 text-center">{item.quantidade}</span>
              <button
                onClick={() => onAddItem(item)}
                className="p-1 bg-green-500 text-white rounded-full"
              >
                <Plus size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={onCheckout}
        className="w-full py-3 bg-green-500 text-white rounded-lg font-medium"
      >
        Finalizar Pedido • R$ {total.toFixed(2)}
      </button>
    </div>
  );
};

export default Cart;
