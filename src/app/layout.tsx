import type { Metadata } from "next";
import { Inter } from "next/font/google";
import type React from "react";
import { ThemeProvider } from "../components/theme-provider";
import { ThemeCustomizerProvider } from "../contexts/ThemeCustomizerContext";
import { Toaster } from "../components/ui/toaster";
import "./globals.css";
import { roboto } from "../lib/fonts";

export const metadata: Metadata = {
  title: "Comandinha - Sistema de Comandas Digital",
  description: "Gerencie seus pedidos de forma simples e intuitiva",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={roboto.className}>
        <ThemeProvider>
          <ThemeCustomizerProvider>
            {children}
            <Toaster />
          </ThemeCustomizerProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
