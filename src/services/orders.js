export const mockOrders = [
  {
    id: "1",
    tableId: "5",
    items: [
      { id: "1", name: "Picanha na Brasa", price: 89.9, quantity: 2 },
      { id: "3", name: "Refrigerante", price: 8.9, quantity: 3 }
    ],
    status: "preparing",
    createdAt: "2024-02-28T15:30:00Z"
  },
  {
    id: "2",
    tableId: "5",
    items: [
      { id: "7", name: "Risoto de Camarão", price: 78.9, quantity: 1 }
    ],
    status: "completed",
    createdAt: "2024-02-28T15:00:00Z"
  }
];

export const fetchTableOrders = async (tableId) => {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve(mockOrders.filter(order => order.tableId === tableId));
    }, 500);
  });
};