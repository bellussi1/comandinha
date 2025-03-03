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
        <h1 className="text-4xl font-bold mb-4">Comandinha</h1>
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

      {/* Admin Menu Button */}
      <div className="fixed bottom-4 right-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="h-10 w-10 rounded-full shadow-lg"
            >
              <Settings className="h-5 w-5" />
              <span className="sr-only">Menu administrativo</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem asChild>
              <Link href="/admin" className="w-full cursor-pointer">
                Acessar Admin
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </main>
  );
}
