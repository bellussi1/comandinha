"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/src/services/auth";
import { useFormSubmit } from "@/src/hooks/useFormSubmit";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { Label } from "@/src/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/src/components/ui/card";
import { Alert, AlertDescription } from "@/src/components/ui/alert";
import { Loader2, LogIn, UserPlus } from "lucide-react";

const loginSchema = z.object({
  email: z
    .string()
    .min(1, "Email é obrigatório")
    .email("Email inválido"),
  senha: z
    .string()
    .min(1, "Senha é obrigatória"),
});

type LoginFormData = z.infer<typeof loginSchema>;

interface LoginFormProps {
  onToggleMode: () => void;
  isRegisterMode: boolean;
}

/**
 * Formulário de login para admin
 */
export function LoginForm({ onToggleMode, isRegisterMode }: LoginFormProps) {
  const router = useRouter();
  const { login } = useAuth();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isValid },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    mode: 'onChange',
  });

  const watchEmail = watch('email');
  const watchSenha = watch('senha');
  
  const isFormValid = isValid && watchEmail && watchSenha;

  const { isLoading, error, handleSubmit: handleFormSubmit } = useFormSubmit({
    onSubmit: async (data: LoginFormData) => {
      await login(data);
    },
    onSuccess: () => {
      router.push("/admin");
    },
  });

  return (
    <Card className="w-full max-w-md mx-auto border-0 shadow-none bg-transparent">
      <CardHeader className="space-y-1 text-center">
        <CardTitle className="text-2xl font-bold">
          Login Administrativo
        </CardTitle>
        <CardDescription>
          Entre com suas credenciais para acessar o painel
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 px-6 pb-6">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="admin@exemplo.com"
              {...register("email")}
              disabled={isLoading}
              className={errors.email ? "border-destructive" : ""}
            />
            {errors.email && (
              <p className="text-sm text-destructive">
                {errors.email.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="senha">Senha</Label>
            <Input
              id="senha"
              type="password"
              placeholder="••••••••"
              {...register("senha")}
              disabled={isLoading}
              className={errors.senha ? "border-destructive" : ""}
            />
            {errors.senha && (
              <p className="text-sm text-destructive">
                {errors.senha.message}
              </p>
            )}
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={isLoading || !isFormValid}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Entrando...
              </>
            ) : (
              <>
                <LogIn className="mr-2 h-4 w-4" />
                Entrar
              </>
            )}
          </Button>
        </form>

        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            Não tem uma conta?{" "}
            <Button
              variant="link"
              className="p-0 h-auto text-sm"
              onClick={onToggleMode}
              disabled={isLoading}
            >
              <UserPlus className="mr-1 h-3 w-3" />
              Criar conta
            </Button>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}