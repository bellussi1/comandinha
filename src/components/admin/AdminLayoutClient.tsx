"use client";

import { useState, useEffect } from "react";
import { AdminSidebar } from "./AdminSidebar";
import { useAuth } from "@/src/services/auth";
import { Button } from "@/src/components/ui/button";
import { ThemeToggle } from "@/src/components/theme-toggle";
import { ThemeCustomizer } from "@/src/components/theme-customizer";
import { Menu } from "lucide-react";

interface AdminLayoutClientProps {
  children: React.ReactNode;
}

export function AdminLayoutClient({ children }: AdminLayoutClientProps) {
  const { isAuthenticated } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Avoid hydration mismatch by not rendering auth-dependent content until mounted
  if (!mounted) {
    return (
      <div className="min-h-screen bg-background">
        <main className="w-full">
          {children}
        </main>
      </div>
    );
  }

  if (!isAuthenticated) {
    // When not authenticated, render full-width layout
    return (
      <div className="min-h-screen bg-background">
        <main className="w-full">
          {children}
        </main>
      </div>
    );
  }

  // When authenticated, render with sidebar
  return (
    <div className="flex h-screen bg-background relative">
      {/* Top header with theme controls */}
      <div className="fixed top-0 right-0 z-50 p-4 flex items-center gap-2">
        <div className="lg:hidden">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setSidebarOpen(true)}
            className="bg-background shadow-md"
          >
            <Menu className="h-4 w-4" />
          </Button>
        </div>
        <ThemeCustomizer />
        <ThemeToggle />
      </div>

      {/* Sidebar */}
      <AdminSidebar 
        isOpen={sidebarOpen} 
        onClose={() => setSidebarOpen(false)} 
      />
      
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      {/* Main content */}
      <main className="flex-1 overflow-auto lg:ml-0">
        <div className="h-16" /> {/* Space for top header */}
        {children}
      </main>
    </div>
  );
}