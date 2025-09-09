"use client";

import { useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/src/components/ui/card";
import { useThemeCustomizer } from "@/src/contexts/ThemeCustomizerContext";
import { THEME_PRESETS } from "@/src/constants/themePresets";
import { useTheme } from "next-themes";

export function ThemePresets() {
  const [applying, setApplying] = useState<string | null>(null);
  const { currentTheme, createTheme, activateTheme } = useThemeCustomizer();
  const { theme: currentMode } = useTheme();

  const applyPreset = async (presetName: string) => {
    const preset = THEME_PRESETS.find(p => p.name === presetName);
    if (!preset) return;

    setApplying(presetName);
    try {
      // Cria o tema com base no preset e ativa imediatamente
      await createTheme({
        ...preset.theme,
        isActive: true
      });
    } catch (error) {
      console.error('Erro ao aplicar preset:', error);
    } finally {
      setApplying(null);
    }
  };

  const isCurrentTheme = (presetName: string) => {
    return currentTheme?.name === presetName;
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-medium mb-1">Temas Predefinidos</h3>
        <p className="text-xs text-muted-foreground">
          Escolha um dos temas prontos para usar
        </p>
      </div>

      <div className="grid gap-3">
        {THEME_PRESETS.map((preset) => {
          const isActive = isCurrentTheme(preset.name);
          const isApplying = applying === preset.name;
          const isDark = currentMode === 'dark';
          const previewColors = isDark ? preset.theme.dark : preset.theme.light;

          return (
            <Card 
              key={preset.name}
              className={`relative cursor-pointer transition-all hover:shadow-md ${
                isActive ? 'ring-2 ring-primary' : ''
              }`}
              onClick={() => !isActive && !isApplying && applyPreset(preset.name)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-sm">{preset.name}</CardTitle>
                    <CardDescription className="text-xs">
                      {preset.description}
                    </CardDescription>
                  </div>
                  
                  {isActive && (
                    <div className="flex items-center gap-1 text-primary">
                      <Check className="h-4 w-4" />
                      <span className="text-xs">Ativo</span>
                    </div>
                  )}
                  
                  {isApplying && (
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  )}
                </div>
              </CardHeader>
              
              <CardContent className="pt-0">
                {/* Preview das cores */}
                <div className="flex gap-2 mb-3">
                  <div
                    className="w-8 h-8 rounded border border-border shadow-sm"
                    style={{ backgroundColor: `hsl(${previewColors.primary})` }}
                    title="Primary"
                  />
                  <div
                    className="w-8 h-8 rounded border border-border shadow-sm"
                    style={{ backgroundColor: `hsl(${previewColors.secondary})` }}
                    title="Secondary"  
                  />
                  <div
                    className="w-8 h-8 rounded border border-border shadow-sm"
                    style={{ backgroundColor: `hsl(${previewColors.accent})` }}
                    title="Accent"
                  />
                  <div
                    className="w-8 h-8 rounded border border-border shadow-sm"
                    style={{ backgroundColor: `hsl(${previewColors.background})` }}
                    title="Background"
                  />
                </div>

                {/* Mini preview */}
                <div 
                  className="p-2 rounded border text-xs"
                  style={{
                    backgroundColor: `hsl(${previewColors.background})`,
                    borderColor: `hsl(${previewColors.border})`,
                    color: `hsl(${previewColors.foreground})`
                  }}
                >
                  <div className="flex gap-1 mb-1">
                    <div 
                      className="px-2 py-0.5 rounded text-xs"
                      style={{
                        backgroundColor: `hsl(${previewColors.primary})`,
                        color: `hsl(${preset.theme.light.background})`
                      }}
                    >
                      Botão
                    </div>
                    <div 
                      className="px-2 py-0.5 rounded border"
                      style={{
                        backgroundColor: `hsl(${previewColors.card})`,
                        borderColor: `hsl(${previewColors.border})`,
                        color: `hsl(${previewColors.foreground})`
                      }}
                    >
                      Card
                    </div>
                  </div>
                  <div style={{ color: `hsl(${previewColors.mutedForeground})` }}>
                    Texto secundário
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="p-3 bg-muted/50 rounded-lg">
        <p className="text-xs text-muted-foreground">
          💡 <strong>Dica:</strong> Após escolher um preset, você pode personalizar as cores individuais na aba &ldquo;Personalizar&rdquo;.
        </p>
      </div>
    </div>
  );
}