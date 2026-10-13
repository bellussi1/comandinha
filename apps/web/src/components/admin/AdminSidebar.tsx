"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/src/lib/utils";
import { Button } from "@/src/components/ui/button";
import {
  LayoutDashboard,
  Package,
  Tag,
  LogOut,
  Settings,
  Calculator,
  X,
  Table,
  Hand
} from "lucide-react";
import { useAuth } from "@/src/services/auth";
import { useRouter } from "next/navigation";
import { ThemeToggle } from "@/src/components/theme-toggle";

const navigation = [
  {
    name: "Painel",
    href: "/admin",
    icon: LayoutDashboard,
  },
  {
    name: "Mesas",
    href: "/admin/mesas",
    icon: Table,
  },
  {
    name: "Chamados",
    href: "/admin/chamados",
    icon: Hand,
  },
  {
    name: "Produtos",
    href: "/admin/produtos",
    icon: Package,
  },
  {
    name: "Categorias",
    href: "/admin/categorias",
    icon: Tag,
  },
  {
    name: "Fechamento",
    href: "/admin/fechamento",
    icon: Calculator,
  },
];

interface AdminSidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function AdminSidebar({ isOpen = false, onClose }: AdminSidebarProps = {}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout, isAuthenticated } = useAuth();

  const handleLogout = () => {
    logout();
    router.push("/admin/login");
  };

  // Don't render sidebar if not authenticated
  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className={cn(
      "flex flex-col h-full w-64 bg-background border-r transition-transform duration-300 ease-in-out",
      "lg:translate-x-0 lg:static lg:z-auto",
      "fixed top-0 left-0 z-50",
      isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
    )}>
      {/* Header */}
      <div className="flex flex-col items-center justify-center p-6 border-b relative">
        {/* Close button for mobile */}
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden absolute top-2 right-2"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </Button>
        <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center mb-3">
          <Settings className="h-6 w-6 text-primary-foreground" />
        </div>
        <h2 className="text-lg font-semibold">Admin Comandinha</h2>
        <p className="text-sm text-muted-foreground">{user?.nome || 'Administrador'}</p>
        <div className="mt-3">
          <ThemeToggle />
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            
            return (
              <li key={item.name}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                >
                  <Icon className="mr-3 h-4 w-4" />
                  {item.name}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t">
        <Button 
          variant="outline" 
          className="w-full justify-start" 
          onClick={handleLogout}
        >
          <LogOut className="mr-3 h-4 w-4" />
          Sair
        </Button>
      </div>
    </div>
  );
}