import { QrCode, Settings } from "lucide-react";
import Link from "next/link";
import { Button } from "../components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";

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
            <Link href="/mesa/demo">
              <QrCode className="h-5 w-5" />
              Acessar Demo
            </Link>
          </Button>

          <p className="text-sm text-muted-foreground mt-4">
            Em um restaurante real, você escanearia o QR Code da sua mesa para
            acessar o menu.
          </p>
        </div>
      </div>
    </main>
  );
}
