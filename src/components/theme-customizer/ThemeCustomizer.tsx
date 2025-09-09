"use client";

import { useState } from "react";
import { Palette, RefreshCw } from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/src/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/src/components/ui/tabs";
import { useThemeCustomizer } from "@/src/contexts/ThemeCustomizerContext";
import { ColorPickers } from "./ColorPickers";
import { ThemePresets } from "./ThemePresets";
import { ThemePreview } from "./ThemePreview";

export function ThemeCustomizer() {
  const [isOpen, setIsOpen] = useState(false);
  const { currentTheme, loading, refreshTheme } = useThemeCustomizer();

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button 
          variant="outline" 
          size="icon" 
          className="rounded-full"
          disabled={loading}
        >
          <Palette className="h-4 w-4" />
          <span className="sr-only">Personalizar cores</span>
        </Button>
      </SheetTrigger>
      
      <SheetContent side="right" className="w-[400px] sm:w-[540px]">
        <SheetHeader>
          <div className="flex items-center justify-between">
            <SheetTitle>🎨 Personalizar Tema</SheetTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={refreshTheme}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Preview do tema atual */}
          <ThemePreview theme={currentTheme} />

          <Tabs defaultValue="presets" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="presets">Presets</TabsTrigger>
              <TabsTrigger value="custom">Personalizar</TabsTrigger>
            </TabsList>
            
            <TabsContent value="presets" className="space-y-4">
              <ThemePresets />
            </TabsContent>
            
            <TabsContent value="custom" className="space-y-4">
              <ColorPickers />
            </TabsContent>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  );
}