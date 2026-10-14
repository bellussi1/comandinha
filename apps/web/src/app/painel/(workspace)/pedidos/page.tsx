import type { Metadata } from "next";
import { OrdersWorkspace } from "@/src/components/painel/pedidos/OrdersWorkspace";

export const metadata: Metadata = {
  title: "Pedidos",
  robots: { index: false, follow: false },
};

export default function OrdersPage() {
  return <OrdersWorkspace />;
}
