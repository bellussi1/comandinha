"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, LoaderCircle } from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { Label } from "@/src/components/ui/label";

type MembershipChoice = {
  membershipId: string;
  role: "OWNER" | "ADMIN" | "STAFF";
  restaurant: { id: string; name: string; slug: string };
};

const errorMessages: Record<number, string> = {
  400: "Confira os dados informados e tente novamente.",
  401: "E-mail ou senha inválidos.",
  429: "Muitas tentativas. Tente novamente em instantes.",
  503: "O serviço está indisponível. Tente novamente em instantes.",
};

export function PainelLoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [memberships, setMemberships] = useState<MembershipChoice[]>([]);
  const [restaurantSlug, setRestaurantSlug] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (memberships.length > 0 && !restaurantSlug) {
      setError("Selecione o restaurante para continuar.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
          ...(restaurantSlug ? { restaurantSlug } : {}),
        }),
      });

      if (response.ok) {
        router.push("/painel/catalogo");
        return;
      }

      if (response.status === 409) {
        const payload: unknown = await response.json().catch(() => null);
        if (
          payload &&
          typeof payload === "object" &&
          "code" in payload &&
          payload.code === "RESTAURANT_SELECTION_REQUIRED" &&
          "memberships" in payload &&
          Array.isArray(payload.memberships)
        ) {
          const choices = payload.memberships.filter(isMembershipChoice);
          if (choices.length > 0) {
            setMemberships(choices);
            setRestaurantSlug("");
            setError("Escolha o restaurante que deseja administrar.");
            return;
          }
        }
      }

      setError(
        errorMessages[response.status] ??
          "Não foi possível entrar agora. Tente novamente.",
      );
    } catch {
      setError("O serviço está indisponível. Tente novamente em instantes.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="painel-login-form" onSubmit={submit}>
      <div className="painel-form-field">
        <Label htmlFor="painel-email">E-mail</Label>
        <Input
          autoComplete="username"
          className="painel-login-input"
          id="painel-email"
          name="email"
          onChange={(event) => setEmail(event.target.value)}
          required
          type="email"
          value={email}
        />
      </div>

      <div className="painel-form-field">
        <Label htmlFor="painel-password">Senha</Label>
        <Input
          autoComplete="current-password"
          className="painel-login-input"
          id="painel-password"
          name="password"
          onChange={(event) => setPassword(event.target.value)}
          required
          type="password"
          value={password}
        />
      </div>

      {memberships.length > 0 && (
        <div className="painel-form-field">
          <Label htmlFor="painel-restaurant">Restaurante</Label>
          <select
            autoComplete="organization"
            className="painel-login-input painel-login-select"
            id="painel-restaurant"
            onChange={(event) => setRestaurantSlug(event.target.value)}
            required
            value={restaurantSlug}
          >
            <option value="">Selecione um restaurante</option>
            {memberships.map((membership) => (
              <option
                key={membership.membershipId}
                value={membership.restaurant.slug}
              >
                {membership.restaurant.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {error && (
        <p className="painel-form-alert" role="alert">
          {error}
        </p>
      )}

      <Button
        className="painel-login-submit"
        disabled={isSubmitting}
        type="submit"
      >
        {isSubmitting ? (
          <>
            <LoaderCircle
              aria-hidden="true"
              className="painel-spin"
              size={17}
            />
            Validando acesso
          </>
        ) : memberships.length > 0 ? (
          <>
            Continuar <ArrowRight aria-hidden="true" size={17} />
          </>
        ) : (
          <>
            Entrar <ArrowRight aria-hidden="true" size={17} />
          </>
        )}
      </Button>
      <p className="painel-login-footnote">
        Acesso restrito a equipes cadastradas.
      </p>
    </form>
  );
}

function isMembershipChoice(value: unknown): value is MembershipChoice {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<MembershipChoice>;
  return (
    typeof candidate.membershipId === "string" &&
    !!candidate.restaurant &&
    typeof candidate.restaurant.name === "string" &&
    typeof candidate.restaurant.slug === "string"
  );
}
