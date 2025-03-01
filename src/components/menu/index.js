'use client';

import { useState } from 'react';
import { MenuWelcomeScreen } from './MenuWelcomeScreen';
import { MenuConfirmationModal } from './MenuConfirmationModal';
import MenuCategorySection from './MenuCategorySection';
import MenuCart from './MenuCart';
import { useCart } from '@/hooks/useCart';
import { categories } from '@/services/menuData';

const MenuAutoatendimento = () => {
  const [currentScreen, setCurrentScreen] = useState('welcome');
  const [showConfirmation, setShowConfirmation] = useState(false);
  const { cart, total, addItem, removeItem, clearCart } = useCart();

  const handleFinalizeOrder = () => {
    setShowConfirmation(true);
    clearCart();
    setTimeout(() => setShowConfirmation(false), 3000);
  };

  return (
    <>
      {currentScreen === 'welcome' ? (
        <MenuWelcomeScreen onContinue={() => setCurrentScreen('menu')} />
      ) : (
        <div className="min-h-screen bg-gray-100">
          {/* Header */}
          <header className="sticky top-0 bg-green-500 text-white p-4 shadow-md z-10">
            <div className="flex justify-between items-center">
              <h1 className="text-xl font-bold">
                Cardápio <br />
                Barão Bar e Restaurante
              </h1>
              <div className="flex items-center gap-2">
                <span className="font-bold">R$ {total.toFixed(2)}</span>
              </div>
            </div>
          </header>

          {/* Conteúdo Principal */}
          <main className="p-4 pb-32">
            {categories.map((category) => (
              <MenuCategorySection
                key={category.nome}
                category={category}
                onAddItem={addItem}
              />
            ))}
          </main>

          {/* Carrinho */}
          {cart.length > 0 && (
            <MenuCart
              items={cart}
              total={total}
              onRemoveItem={removeItem}
              onAddItem={addItem}
              onCheckout={handleFinalizeOrder}
            />
          )}

          {/* Modal de Confirmação */}
          {showConfirmation && <MenuConfirmationModal />}
        </div>
      )}
    </>
  );
};

export default MenuAutoatendimento;