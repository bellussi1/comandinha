import { Plus } from "lucide-react";

const MenuItem = ({ item, onAdd }) => (
  <div className="flex justify-between items-center p-3 bg-white rounded-lg shadow-sm">
    <div className="flex-1">
      <h3 className="font-medium">{item.nome}</h3>
      <p className="text-sm text-gray-600">{item.descricao}</p>
      <p className="text-base font-bold mt-1">R$ {item.preco.toFixed(2)}</p>
    </div>
    <button
      onClick={() => onAdd(item)}
      className="p-2 bg-green-500 text-white rounded-full hover:bg-green-600"
    >
      <Plus size={20} />
    </button>
  </div>
);

export default MenuItem;
