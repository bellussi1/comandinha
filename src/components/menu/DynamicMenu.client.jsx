"use client";

import dynamic from "next/dynamic";

const MenuAutoatendimento = dynamic(
  () => import("@/components/menu/MenuAutoatendimento"),
  {
    ssr: false,
    loading: () => <p>Carregando cardápio...</p>,
  }
);

export default function DynamicMenuLoader() {
  return <MenuAutoatendimento />;
}
