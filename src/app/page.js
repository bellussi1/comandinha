import dynamic from 'next/dynamic';

// Carregamento otimizado sem SSR
const MenuAutoatendimento = dynamic(
  () => import('@/components/menu-autoatendimento'),
  { ssr: true }
);

export default function Home() {
  return (
    <main>
      <MenuAutoatendimento />
    </main>
  );
}