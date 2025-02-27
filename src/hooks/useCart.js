import { useState } from "react";

export const useCart = () => {
  const [cart, setCart] = useState([]);
  const [total, setTotal] = useState(0);

  const addItem = (item) => {
    const existingItem = cart.find(i => i.id === item.id);

    if (existingItem) {
      setCart(cart.map(i =>
        i.id === item.id ? { ...i, quantidade: i.quantidade + 1 } : i
      ));
    } else {
      setCart([...cart, { ...item, quantidade: 1 }]);
    }

    setTotal(prev => prev + item.preco);
  };

  const removeItem = (item) => {
    const existingItem = cart.find(i => i.id === item.id);

    if (existingItem.quantidade > 1) {
      setCart(cart.map(i =>
        i.id === item.id ? { ...i, quantidade: i.quantidade - 1 } : i
      ));
    } else {
      setCart(cart.filter(i => i.id !== item.id));
    }

    setTotal(prev => prev - item.preco);
  };

  const clearCart = () => {
    setCart([]);
    setTotal(0);
  };

  return { cart, total, addItem, removeItem, clearCart };
};