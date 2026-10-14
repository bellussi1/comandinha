import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import type React from "react";
import { ThemeProvider } from "../components/theme-provider";
import { Toaster } from "../components/ui/toaster";
import { OptimizedScripts } from "../components/OptimizedScripts";
import "./globals.css";
import { roboto } from "../lib/fonts";

export const metadata: Metadata = {
  title: "Comandinha - Sistema de Comandas Digital",
  description: "Gerencie seus pedidos de forma simples e intuitiva",
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#09090b' }
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://comandinha.onrender.com';

  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <link rel="dns-prefetch" href={API_URL} />
        <link rel="preconnect" href={API_URL} crossOrigin="anonymous" />
      </head>
      <body className={roboto.className}>
        <ThemeProvider>
          {children}
          <Toaster />
          <OptimizedScripts />
        </ThemeProvider>
      </body>
    </html>
  );
}
