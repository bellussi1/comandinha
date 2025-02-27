export const saveCart = (cart) => {
  localStorage.setItem('cart', JSON.stringify(cart));
};

export const loadCart = () => {
  return JSON.parse(localStorage.getItem('cart')) || [];
};