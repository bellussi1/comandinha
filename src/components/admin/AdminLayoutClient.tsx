"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AdminSidebar } from "./AdminSidebar";
import { useAuth } from "@/src/services/auth";
import { Button } from "@/src/components/ui/button";
import { Menu } from "lucide-react";

interface AdminLayoutClientProps {
  children: React.ReactNode;
}

function AdminLayoutClientComponent({ children }: AdminLayoutClientProps) {
  const { isAuthenticated, refreshAuthState } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Force refresh auth state when component mounts
    refreshAuthState();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Also refresh auth state when navigation occurs
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refreshAuthState();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setSidebarOpen(true)}
          className="bg-background shadow-md"
        >
          <Menu className="h-4 w-4" />
        </Button>
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
        <div className="lg:hidden h-16" /> {/* Space for mobile menu button */}
        {children}
      </main>
    </div>
  );
}

// Memoize AdminLayoutClient to prevent unnecessary re-renders
// Only re-render when children change (which is expected behavior for layouts)
export const AdminLayoutClient = React.memo(AdminLayoutClientComponent);