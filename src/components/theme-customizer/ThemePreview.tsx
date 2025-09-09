"use client";

import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card";
import { useTheme } from "next-themes";
import type { CustomTheme } from "@/src/types";

interface ThemePreviewProps {
  theme: CustomTheme | null;
}

export function ThemePreview({ theme }: ThemePreviewProps) {
  const { theme: currentMode } = useTheme();
  
  if (!theme) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Preview do Tema</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Nenhum tema ativo</p>
        </CardContent>
      </Card>
    );
  }

  const isCurrentlyDark = currentMode === 'dark';
  const previewColors = isCurrentlyDark ? theme.dark : theme.light;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">Preview do Tema</CardTitle>
          <Badge variant="secondary" className="text-xs">
            {isCurrentlyDark ? 'Modo Escuro' : 'Modo Claro'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Nome do tema */}
        <div>
          <h3 className="font-medium text-sm">{theme.name}</h3>
          <p className="text-xs text-muted-foreground">Tema ativo atual</p>
        </div>

        {/* Miniatura dos componentes */}
        <div 
          className="p-4 rounded-lg border space-y-3"
          style={{
            backgroundColor: `hsl(${previewColors.background})`,
            borderColor: `hsl(${previewColors.border})`,
            color: `hsl(${previewColors.foreground})`
          }}
        >
          {/* Botões */}
          <div className="flex gap-2">
            <div 
              className="px-3 py-1 rounded text-xs font-medium"
              style={{
                backgroundColor: `hsl(${previewColors.primary})`,
                color: `hsl(${theme.light.background})` // sempre usar foreground contrário
              }}
            >
              Primary
            </div>
            <div 
              className="px-3 py-1 rounded text-xs font-medium border"
              style={{
                backgroundColor: `hsl(${previewColors.secondary})`,
                color: `hsl(${previewColors.foreground})`,
                borderColor: `hsl(${previewColors.border})`
              }}
            >
              Secondary
            </div>
          </div>

          {/* Card de exemplo */}
          <div 
            className="p-3 rounded border"
            style={{
              backgroundColor: `hsl(${previewColors.card})`,
              borderColor: `hsl(${previewColors.border})`
            }}
          >
            <div className="text-xs font-medium mb-1">Card de Exemplo</div>
            <div 
              className="text-xs"
              style={{ color: `hsl(${previewColors.mutedForeground})` }}
            >
              Este é um preview do seu tema
            </div>
          </div>

          {/* Input de exemplo */}
          <div 
            className="px-3 py-1 rounded border text-xs"
            style={{
              backgroundColor: `hsl(${previewColors.background})`,
              borderColor: `hsl(${previewColors.input})`,
              color: `hsl(${previewColors.foreground})`
            }}
          >
            Campo de entrada
          </div>
        </div>

        {/* Palette de cores */}
        <div>
          <p className="text-xs font-medium mb-2">Cores principais:</p>
          <div className="flex gap-1">
            {[
              { name: 'Primary', color: previewColors.primary },
              { name: 'Secondary', color: previewColors.secondary },
              { name: 'Accent', color: previewColors.accent },
              { name: 'Destructive', color: previewColors.destructive },
            ].map((colorInfo) => (
              <div
                key={colorInfo.name}
                className="w-6 h-6 rounded border border-border"
                style={{ backgroundColor: `hsl(${colorInfo.color})` }}
                title={colorInfo.name}
              />
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}