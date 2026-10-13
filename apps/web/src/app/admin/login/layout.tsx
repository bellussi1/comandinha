import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Login Admin - Comandinha",
  description: "Acesso administrativo ao sistema de comandas",
  robots: "noindex,nofollow",
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}