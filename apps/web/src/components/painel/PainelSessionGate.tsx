"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, RotateCw } from "lucide-react";
import type { ApiPaths } from "@comandinha/api-client";
import { Button } from "@/src/components/ui/button";
import { PainelShell } from "./PainelShell";
import { PainelSessionProvider } from "./PainelSessionContext";

type PanelSession =
  ApiPaths["/auth/sessions/current"]["get"]["responses"][200]["content"]["application/json"];
type GateState =
  | { status: "loading" }
  | { status: "unavailable" }
  | { status: "ready"; session: PanelSession };

export function PainelSessionGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [state, setState] = useState<GateState>({ status: "loading" });

  const fetchSessionState = useCallback(async (): Promise<GateState> => {
    try {
      const response = await fetch("/api/auth/session", {
        method: "GET",
        cache: "no-store",
      });
      if (response.status === 401) {
        router.replace("/painel/login");
        return { status: "loading" };
      }
      if (!response.ok) {
        return { status: "unavailable" };
      }
      const session = (await response.json()) as PanelSession;
      return { status: "ready", session };
    } catch {
      return { status: "unavailable" };
    }
  }, [router]);

  const loadSession = useCallback(async () => {
    setState({ status: "loading" });
    setState(await fetchSessionState());
  }, [fetchSessionState]);

  useEffect(() => {
    let active = true;
    void fetchSessionState().then((nextState) => {
      if (active) setState(nextState);
    });
    return () => {
      active = false;
    };
  }, [fetchSessionState]);

  async function logout() {
    const response = await fetch("/api/auth/session", { method: "DELETE" });
    if (!response.ok) throw new Error("Session logout failed.");
    router.replace("/painel/login");
    router.refresh();
  }

  if (state.status === "loading") {
    return (
      <div className="painel-state-screen" role="status" aria-live="polite">
        <LoaderCircle aria-hidden="true" className="painel-spin" size={22} />
        Validando sua sessão…
      </div>
    );
  }

  if (state.status === "unavailable") {
    return (
      <div className="painel-state-screen">
        <div className="painel-state-card" role="alert">
          <span className="painel-eyebrow">CONEXÃO INTERROMPIDA</span>
          <h1>Não foi possível validar sua sessão agora.</h1>
          <p>
            Seus dados continuam protegidos. Verifique a conexão e tente
            novamente.
          </p>
          <Button
            onClick={() => void loadSession()}
            type="button"
            variant="outline"
          >
            <RotateCw aria-hidden="true" size={16} />
            Tentar novamente
          </Button>
        </div>
      </div>
    );
  }

  return (
    <PainelSessionProvider session={state.session}>
      <PainelShell onLogout={logout} session={state.session}>
        {children}
      </PainelShell>
    </PainelSessionProvider>
  );
}
