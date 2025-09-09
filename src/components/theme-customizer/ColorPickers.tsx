"use client";

import { useState } from "react";
import { HexColorPicker } from "react-colorful";
import { RotateCcw, Palette } from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card";
import { Label } from "@/src/components/ui/label";
import { Input } from "@/src/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/src/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/src/components/ui/tabs";
import { useTheme } from "next-themes";
import { useThemeCustomizer } from "@/src/contexts/ThemeCustomizerContext";
import type { ThemeColors } from "@/src/types";

// Utilidades para converter cores
const hexToHsl = (hex: string): string => {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }

  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
};

const hslToHex = (hsl: string): string => {
  const [h, s, l] = hsl.split(' ').map((v, i) => {
    if (i === 0) return parseInt(v) / 360;
    return parseInt(v.replace('%', '')) / 100;
  });

  const hue2rgb = (p: number, q: number, t: number): number => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1/6) return p + (q - p) * 6 * t;
    if (t < 1/2) return q;
    if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
    return p;
  };

  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  
  const r = Math.round(hue2rgb(p, q, h + 1/3) * 255);
  const g = Math.round(hue2rgb(p, q, h) * 255);
  const b = Math.round(hue2rgb(p, q, h - 1/3) * 255);

  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
};

interface ColorPickerProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  description?: string;
}

function ColorPickerInput({ label, value, onChange, description }: ColorPickerProps) {
  const [hexValue, setHexValue] = useState(hslToHex(value));
  const [isOpen, setIsOpen] = useState(false);

  const handleColorChange = (newHex: string) => {
    setHexValue(newHex);
    const hslValue = hexToHsl(newHex);
    onChange(hslValue);
  };

  const handleInputChange = (newHex: string) => {
    if (/^#[0-9A-Fa-f]{6}$/.test(newHex)) {
      handleColorChange(newHex);
    }
    setHexValue(newHex);
  };

  return (
    <div className="space-y-2">
      <div>
        <Label className="text-sm font-medium">{label}</Label>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </div>
      
      <div className="flex gap-2">
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="w-12 h-10 p-0 border-2"
              style={{ backgroundColor: hexValue }}
            >
              <span className="sr-only">Escolher cor</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-3" side="right">
            <HexColorPicker color={hexValue} onChange={handleColorChange} />
          </PopoverContent>
        </Popover>
        
        <Input
          value={hexValue}
          onChange={(e) => handleInputChange(e.target.value)}
          className="font-mono text-sm"
          placeholder="#000000"
        />
      </div>
    </div>
  );
}

export function ColorPickers() {
  const { theme: currentMode } = useTheme();
  const { currentTheme, updateThemeColors } = useThemeCustomizer();
  
  if (!currentTheme) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <Palette className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Nenhum tema ativo para personalizar
          </p>
        </CardContent>
      </Card>
    );
  }

  const isDark = currentMode === 'dark';
  const currentColors = isDark ? currentTheme.dark : currentTheme.light;
  const mode = isDark ? 'dark' : 'light';

  const handleColorChange = async (colorKey: keyof ThemeColors, newValue: string) => {
    await updateThemeColors(mode, { [colorKey]: newValue });
  };

  const resetToDefault = () => {
    // Implementar reset para cores padrão
    console.log('Reset to default colors');
  };

  const colorSections = [
    {
      title: "Cores Principais",
      description: "Cores primárias da interface",
      colors: [
        { key: 'primary' as keyof ThemeColors, label: 'Primária', description: 'Botões principais, links' },
        { key: 'secondary' as keyof ThemeColors, label: 'Secundária', description: 'Botões secundários' },
        { key: 'accent' as keyof ThemeColors, label: 'Destaque', description: 'Elementos em foco' },
        { key: 'destructive' as keyof ThemeColors, label: 'Destrutiva', description: 'Ações de perigo' },
      ]
    },
    {
      title: "Backgrounds",
      description: "Cores de fundo dos elementos",
      colors: [
        { key: 'background' as keyof ThemeColors, label: 'Fundo Principal', description: 'Fundo da página' },
        { key: 'card' as keyof ThemeColors, label: 'Fundo de Cards', description: 'Fundo de cartões' },
        { key: 'popover' as keyof ThemeColors, label: 'Fundo de Popups', description: 'Menus e modais' },
      ]
    },
    {
      title: "Textos",
      description: "Cores dos textos",
      colors: [
        { key: 'foreground' as keyof ThemeColors, label: 'Texto Principal', description: 'Texto primário' },
        { key: 'muted' as keyof ThemeColors, label: 'Fundo Esmaecido', description: 'Backgrounds sutis' },
      ]
    },
    {
      title: "Elementos de Interface",
      description: "Bordas, inputs e outros elementos",
      colors: [
        { key: 'border' as keyof ThemeColors, label: 'Bordas', description: 'Bordas de elementos' },
        { key: 'input' as keyof ThemeColors, label: 'Inputs', description: 'Campos de entrada' },
        { key: 'ring' as keyof ThemeColors, label: 'Focus Ring', description: 'Anel de foco' },
      ]
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium">Personalizar Cores</h3>
          <p className="text-xs text-muted-foreground">
            Ajuste as cores do modo {isDark ? 'escuro' : 'claro'}
          </p>
        </div>
        
        <Button variant="outline" size="sm" onClick={resetToDefault}>
          <RotateCcw className="h-4 w-4 mr-2" />
          Resetar
        </Button>
      </div>

      <Tabs value={mode} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="light">☀️ Claro</TabsTrigger>
          <TabsTrigger value="dark">🌙 Escuro</TabsTrigger>
        </TabsList>

        <TabsContent value={mode} className="space-y-6 mt-4">
          {colorSections.map((section) => (
            <Card key={section.title}>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">{section.title}</CardTitle>
                <p className="text-xs text-muted-foreground">{section.description}</p>
              </CardHeader>
              <CardContent className="space-y-4">
                {section.colors.map((color) => (
                  <ColorPickerInput
                    key={color.key}
                    label={color.label}
                    description={color.description}
                    value={currentColors[color.key]}
                    onChange={(value) => handleColorChange(color.key, value)}
                  />
                ))}
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>

      <div className="p-3 bg-muted/50 rounded-lg">
        <p className="text-xs text-muted-foreground">
          💡 <strong>Dica:</strong> As cores são salvas automaticamente e aplicadas em tempo real. Use o formato HSL para maior precisão.
        </p>
      </div>
    </div>
  );
}