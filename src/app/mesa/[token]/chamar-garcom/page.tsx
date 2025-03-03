"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Bell, Clock } from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { Card, CardContent } from "@/src/components/ui/card";
import { useToast } from "@/src/components/ui/use-toast";
import { Toaster } from "@/src/components/ui/toaster";

export default function ChamarGarcomPage() {
  const params = useParams();
  const router = useRouter();
  const { token } = params;
  const { toast } = useToast();

  const [motivoSelecionado, setMotivoSelecionado] = useState<string | null>(
    null
  );
  const [cooldown, setCooldown] = useState(false);

  const motivos = [
    { id: "conta", texto: "Pedir a conta" },
    { id: "duvida", texto: "Tirar dúvidas" },
    { id: "bebida", texto: "Pedir mais bebidas" },
    { id: "problema", texto: "Reportar um problema" },
    { id: "outro", texto: "Outro motivo" },
  ];

  const chamarGarcom = () => {
    if (!motivoSelecionado || cooldown) return;

    // Simular vibração do dispositivo se suportado
    if (navigator.vibrate) {
      navigator.vibrate(200);
    }

    toast({
      title: "Garçom chamado",
      description: "Um garçom virá até sua mesa em instantes",
      duration: 5000,
    });

    setCooldown(true);

    // Redirecionar após um breve delay
    setTimeout(() => {
      router.push(`/mesa/${token}`);
    }, 2000);
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background border-b">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" asChild>
              <Link href={`/mesa/${token}`}>
                <ArrowLeft className="h-5 w-5" />
                <span className="sr-only">Voltar</span>
              </Link>
            </Button>
            <h1 className="font-bold text-lg">Chamar garçom</h1>
          </div>
        </div>
      </header>

      {/* Conteúdo principal */}
      <main className="flex-1 container mx-auto px-4 py-6">
        <div className="text-center mb-8">
          <div className="mx-auto w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <Bell className="h-10 w-10 text-primary" />
          </div>
          <h2 className="text-xl font-bold mb-2">Chamar um garçom</h2>
          <p className="text-muted-foreground">
            Selecione o motivo para chamar um garçom para sua mesa
          </p>
        </div>

        <div className="space-y-3 mb-8">
          {motivos.map((motivo) => (
            <Card
              key={motivo.id}
              className={`cursor-pointer transition-all ${
                motivoSelecionado === motivo.id
                  ? "border-primary bg-primary/5"
                  : "hover:border-primary/50"
              }`}
              onClick={() => setMotivoSelecionado(motivo.id)}
            >
              <CardContent className="p-4 flex items-center justify-between">
                <span className="font-medium">{motivo.texto}</span>
                {motivoSelecionado === motivo.id && (
                  <div className="h-3 w-3 rounded-full bg-primary"></div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        <Button
          className="w-full"
          disabled={!motivoSelecionado || cooldown}
          onClick={chamarGarcom}
        >
          {cooldown ? (
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 animate-spin" />
              <span>Garçom a caminho...</span>
            </div>
          ) : (
            "Chamar garçom"
          )}
        </Button>
      </main>

      <Toaster />
    </div>
  );
}
