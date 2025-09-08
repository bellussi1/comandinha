import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Painel Admin - Comandinha",
  description: "Sistema administrativo para gerenciamento de pedidos e cardápio",
  robots: "noindex,nofollow", // Admin não deve ser indexado
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}