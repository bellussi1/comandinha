"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowUpRight,
  Armchair,
  ClipboardList,
  House,
  LayoutGrid,
  LogOut,
  UtensilsCrossed,
} from "lucide-react";
import type { ApiPaths } from "@comandinha/api-client";

type PanelSession =
  ApiPaths["/auth/sessions/current"]["get"]["responses"][200]["content"]["application/json"];

type PainelShellProps = {
  children: React.ReactNode;
  session: PanelSession;
  onLogout: () => Promise<void>;
};

const navigation = [
  { href: "/painel", label: "Visão geral", icon: House },
  { href: "/painel/catalogo", label: "Catálogo", icon: LayoutGrid },
  { href: "/painel/mesas", label: "Mesas", icon: Armchair },
  { href: "/painel/pedidos", label: "Pedidos", icon: ClipboardList },
];

const roleLabels: Record<string, string> = {
  OWNER: "Proprietário",
  ADMIN: "Administrador",
  STAFF: "Equipe",
};

export function PainelShell({ children, session, onLogout }: PainelShellProps) {
  const pathname = usePathname();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);

  async function handleLogout() {
    setIsLoggingOut(true);
    setLogoutError(null);
    try {
      await onLogout();
    } catch {
      setLogoutError("Não foi possível encerrar a sessão. Tente novamente.");
    } finally {
      setIsLoggingOut(false);
    }
  }

  return (
    <div className="painel-shell">
      <aside className="painel-sidebar" aria-label="Navegação do painel">
        <Link
          className="painel-brand"
          href="/painel"
          aria-label="Comandinha, início do painel"
        >
          <span className="painel-brand-mark" aria-hidden="true">
            <UtensilsCrossed size={19} strokeWidth={2.2} />
          </span>
          <span>
            <strong>comandinha</strong>
            <small>painel de gestão</small>
          </span>
        </Link>

        <div className="painel-restaurant-card">
          <span className="painel-eyebrow">RESTAURANTE</span>
          <strong>{session.restaurant.name}</strong>
          <span>{roleLabels[session.membership.role] ?? "Equipe"}</span>
        </div>

        <nav className="painel-navigation">
          <span className="painel-eyebrow">ESPAÇO DE TRABALHO</span>
          {navigation.map(({ href, label, icon: Icon }) => {
            const active =
              href === "/painel"
                ? pathname === href
                : pathname.startsWith(href);
            return (
              <Link
                aria-current={active ? "page" : undefined}
                className={`painel-nav-link${active ? " is-active" : ""}`}
                href={href}
                key={href}
              >
                <Icon aria-hidden="true" size={18} />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="painel-sidebar-bottom">
          <Link className="painel-legacy-link" href="/admin">
            <span>Abrir painel legado</span>
            <ArrowUpRight aria-hidden="true" size={15} />
          </Link>
          <div className="painel-user-row">
            <span className="painel-avatar" aria-hidden="true">
              {session.user.name.trim().charAt(0).toUpperCase()}
            </span>
            <span className="painel-user-copy">
              <strong>{session.user.name}</strong>
              <small>{session.user.email}</small>
            </span>
            <button
              aria-label="Sair"
              className="painel-logout-button"
              disabled={isLoggingOut}
              onClick={handleLogout}
              type="button"
            >
              <LogOut aria-hidden="true" size={17} />
            </button>
          </div>
        </div>
      </aside>

      <div className="painel-main-column">
        <header className="painel-mobile-header">
          <Link className="painel-brand" href="/painel">
            <span className="painel-brand-mark" aria-hidden="true">
              <UtensilsCrossed size={18} />
            </span>
            <strong>comandinha</strong>
          </Link>
          <button
            aria-label="Sair"
            className="painel-logout-button"
            disabled={isLoggingOut}
            onClick={handleLogout}
            type="button"
          >
            <LogOut aria-hidden="true" size={17} />
          </button>
        </header>
        <div className="painel-mobile-restaurant">
          {session.restaurant.name}
        </div>
        <nav
          aria-label="Navegação principal"
          className="painel-mobile-navigation"
        >
          {navigation.map(({ href, label, icon: Icon }) => {
            const active =
              href === "/painel" ? pathname === href : pathname.startsWith(href);
            return (
              <Link
                aria-current={active ? "page" : undefined}
                className={`painel-mobile-nav-link${active ? " is-active" : ""}`}
                href={href}
                key={href}
              >
                <Icon aria-hidden="true" size={18} />
                <span>{label}</span>
              </Link>
            );
          })}
        </nav>
        <main className="painel-main-content">
          {logoutError && (
            <p className="painel-form-alert" role="alert">
              {logoutError}
            </p>
          )}
          {children}
        </main>
      </div>
    </div>
  );
}
