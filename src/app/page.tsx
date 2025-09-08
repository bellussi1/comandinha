import { QrCode } from "lucide-react";
import Link from "next/link";
import { Button } from "../components/ui/button";

// UUID de uma mesa de teste que deve sempre estar ativa
const MESA_DEMO_UUID = "f6b32e2f-423d-40a1-8a8f-3f37f04f06a2";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 text-center">
      <div className="max-w-md mx-auto">
        <h1 className="text-4xl font-black mb-4">COMANDINHA</h1>
        <p className="text-muted-foreground mb-8">
          Sistema de comandas digital para restaurantes. Escaneie o QR Code da
          sua mesa para começar.
        </p>

        <div className="flex flex-col gap-4">
          <Button asChild size="lg" className="gap-2">
            <Link href={`/mesa/${MESA_DEMO_UUID}`}>
              <QrCode className="h-5 w-5" />
              Acessar Demo
            </Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
