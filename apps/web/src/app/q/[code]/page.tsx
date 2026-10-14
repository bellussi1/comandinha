import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PublicMenu } from "@/src/components/public-menu/PublicMenu";
import "@/src/components/public-menu/public-menu.css";

export const metadata: Metadata = {
  title: "Cardápio digital | Comandinha",
  robots: { index: false, follow: false },
};

const publicCodePattern = /^[A-Za-z0-9_-]{43}$/;

export default async function PublicQrMenuPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  if (!publicCodePattern.test(code)) notFound();

  return <PublicMenu code={code} />;
}
