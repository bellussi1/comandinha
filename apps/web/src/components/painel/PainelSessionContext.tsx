"use client";

import { createContext, useContext } from "react";
import type { ApiPaths } from "@comandinha/api-client";

export type PainelSession =
  ApiPaths["/auth/sessions/current"]["get"]["responses"][200]["content"]["application/json"];

const PainelSessionContext = createContext<PainelSession | null>(null);

export function PainelSessionProvider({
  session,
  children,
}: {
  session: PainelSession;
  children: React.ReactNode;
}) {
  return (
    <PainelSessionContext.Provider value={session}>
      {children}
    </PainelSessionContext.Provider>
  );
}

export function usePainelSession(): PainelSession {
  const session = useContext(PainelSessionContext);
  if (!session) {
    throw new Error("PainelSessionProvider is required for panel workspace UI.");
  }
  return session;
}
