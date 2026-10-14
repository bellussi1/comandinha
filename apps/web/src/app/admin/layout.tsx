import { Metadata } from "next";
import { AdminLayoutClient } from "@/src/components/admin/AdminLayoutClient";

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
  return <AdminLayoutClient>{children}</AdminLayoutClient>;
}