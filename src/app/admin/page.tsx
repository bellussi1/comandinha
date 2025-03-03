"use client";

import { useState } from "react";
import Link from "next/link";
import { TableProperties, History, Settings } from "lucide-react";
import { Button } from "@/src/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/src/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/src/components/ui/tabs";

export default function AdminPage() {
  const [selectedTab, setSelectedTab] = useState("mesas");

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-10 bg-background border-b">
        <div className="container mx-auto px-4 py-3">
          <h1 className="font-bold text-lg">Painel Administrativo</h1>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-6">
        <Tabs
          defaultValue="mesas"
          value={selectedTab}
          onValueChange={setSelectedTab}
        >
          <TabsList className="w-full mb-6">
            <TabsTrigger value="mesas" className="flex-1">
              <TableProperties className="h-4 w-4 mr-2" />
              Mesas
            </TabsTrigger>
            <TabsTrigger value="historico" className="flex-1">
              <History className="h-4 w-4 mr-2" />
              Histórico
            </TabsTrigger>
            <TabsTrigger value="configuracoes" className="flex-1">
              <Settings className="h-4 w-4 mr-2" />
              Configurações
            </TabsTrigger>
          </TabsList>

          {selectedTab === "mesas" && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 12 }, (_, i) => i + 1).map((mesa) => (
                <Link key={mesa} href={`/admin/mesas/${mesa}/pedidos`}>
                  <Card className="hover:shadow-md transition-shadow cursor-pointer">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">Mesa {mesa}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">Status:</span>
                        <span className="font-medium text-green-600">
                          Ocupada
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-sm mt-1">
                        <span className="text-muted-foreground">
                          Pedidos em aberto:
                        </span>
                        <span className="font-medium">2</span>
                      </div>
                      <div className="flex justify-between items-center text-sm mt-1">
                        <span className="text-muted-foreground">
                          Última atualização:
                        </span>
                        <span className="font-medium">5 min atrás</span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}

          {selectedTab === "historico" && (
            <div className="text-center py-12">
              <History className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h2 className="text-xl font-bold mb-2">Histórico de Pedidos</h2>
              <p className="text-muted-foreground mb-6">
                Visualize e exporte o histórico completo de pedidos
              </p>
              <Button>Ver histórico completo</Button>
            </div>
          )}

          {selectedTab === "configuracoes" && (
            <div className="text-center py-12">
              <Settings className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h2 className="text-xl font-bold mb-2">Configurações</h2>
              <p className="text-muted-foreground mb-6">
                Configure as opções do sistema
              </p>
              <Button>Acessar configurações</Button>
            </div>
          )}
        </Tabs>
      </main>
    </div>
  );
}
