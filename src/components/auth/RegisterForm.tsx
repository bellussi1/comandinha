"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AuthService } from "@/src/services/auth";
import { PasswordUtils } from "@/src/utils/password";
import { useFormSubmit } from "@/src/hooks/useFormSubmit";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { Label } from "@/src/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/src/components/ui/card";
import { Alert, AlertDescription } from "@/src/components/ui/alert";
import { Progress } from "@/src/components/ui/progress";
import { Loader2, Eye, EyeOff, UserPlus, LogIn, CheckCircle, XCircle } from "lucide-react";

const registerSchema = z.object({
  nome: z
    .string()
    .min(2, "Nome deve ter pelo menos 2 caracteres")
    .max(50, "Nome deve ter no máximo 50 caracteres"),
  email: z
    .string()
    .min(1, "Email é obrigatório")
    .email("Email inválido"),
  confirmEmail: z
    .string()
    .min(1, "Confirmação de email é obrigatória"),
  senha: z
    .string()
    .min(8, "Senha deve ter pelo menos 8 caracteres"),
  confirmSenha: z
    .string()
    .min(1, "Confirmação de senha é obrigatória"),
}).refine((data) => data.email === data.confirmEmail, {
  message: "Os emails não coincidem",
  path: ["confirmEmail"],
}).refine((data) => data.senha === data.confirmSenha, {
  message: "As senhas não coincidem",
  path: ["confirmSenha"],
});

type RegisterFormData = z.infer<typeof registerSchema>;

interface RegisterFormProps {
  onToggleMode: () => void;
}

/**
 * Formulário de registro para admin
 */
export function RegisterForm({ onToggleMode }: RegisterFormProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState<{
    isValid: boolean;
    errors: string[];
  }>({ isValid: false, errors: [] });
  const router = useRouter();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const watchPassword = watch("senha");

  const { isLoading, error, handleSubmit: handleFormSubmit } = useFormSubmit({
    onSubmit: async (data: RegisterFormData) => {
      // Validar força da senha antes de enviar
      const passwordValidation = PasswordUtils.validateStrength(data.senha);
      if (!passwordValidation.isValid) {
        throw new Error(passwordValidation.errors.join(", "));
      }

      await AuthService.register(data);
    },
    onSuccess: () => {
      router.push("/admin");
    },
  });

  // Validar força da senha em tempo real
  useEffect(() => {
    if (watchPassword) {
      setPasswordStrength(PasswordUtils.validateStrength(watchPassword));
    } else {
      setPasswordStrength({ isValid: false, errors: [] });
    }
  }, [watchPassword]);

  const calculatePasswordStrength = (password: string): number => {
    if (!password) return 0;
    
    let strength = 0;
    if (password.length >= 8) strength += 20;
    if (/[A-Z]/.test(password)) strength += 20;
    if (/[a-z]/.test(password)) strength += 20;
    if (/\d/.test(password)) strength += 20;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) strength += 20;
    
    return strength;
  };

  const strengthScore = calculatePasswordStrength(watchPassword || "");
  const strengthColor = strengthScore < 40 ? "bg-destructive" : 
                       strengthScore < 80 ? "bg-yellow-500" : "bg-green-500";

  return (
    <Card className="w-full max-w-md mx-auto border-0 shadow-none bg-transparent">
      <CardHeader className="space-y-1 text-center">
        <CardTitle className="text-2xl font-bold">
          Criar Conta Admin
        </CardTitle>
        <CardDescription>
          Crie sua conta para acessar o painel administrativo
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
            <Label htmlFor="nome">Nome completo</Label>
            <Input
              id="nome"
              type="text"
              placeholder="João Silva"
              {...register("nome")}
              disabled={isLoading}
              className={errors.nome ? "border-destructive" : ""}
            />
            {errors.nome && (
              <p className="text-sm text-destructive">
                {errors.nome.message}
              </p>
            )}
          </div>

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
            <Label htmlFor="confirmEmail">Confirmar email</Label>
            <Input
              id="confirmEmail"
              type="email"
              placeholder="admin@exemplo.com"
              {...register("confirmEmail")}
              disabled={isLoading}
              className={errors.confirmEmail ? "border-destructive" : ""}
            />
            {errors.confirmEmail && (
              <p className="text-sm text-destructive">
                {errors.confirmEmail.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="senha">Senha</Label>
            <div className="relative">
              <Input
                id="senha"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                {...register("senha")}
                disabled={isLoading}
                className={` ${errors.senha ? "border-destructive" : ""}`}
              />
      
            </div>
            <div className="space-y-3">
              <div className="text-xs font-medium text-muted-foreground">
                Requisitos para senha forte:
              </div>
              <div className="grid grid-cols-1 gap-1 text-xs">
                <div className="flex items-center gap-2">
                  {watchPassword && watchPassword.length >= 8 ? (
                    <CheckCircle className="h-3 w-3 text-green-600 flex-shrink-0" />
                  ) : (
                    <XCircle className="h-3 w-3 text-gray-400 flex-shrink-0" />
                  )}
                  <span className={watchPassword && watchPassword.length >= 8 ? "text-green-600" : "text-gray-600"}>
                    Pelo menos 8 caracteres
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {watchPassword && /[A-Z]/.test(watchPassword) ? (
                    <CheckCircle className="h-3 w-3 text-green-600 flex-shrink-0" />
                  ) : (
                    <XCircle className="h-3 w-3 text-gray-400 flex-shrink-0" />
                  )}
                  <span className={watchPassword && /[A-Z]/.test(watchPassword) ? "text-green-600" : "text-gray-600"}>
                    Uma letra maiúscula (A-Z)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {watchPassword && /[a-z]/.test(watchPassword) ? (
                    <CheckCircle className="h-3 w-3 text-green-600 flex-shrink-0" />
                  ) : (
                    <XCircle className="h-3 w-3 text-gray-400 flex-shrink-0" />
                  )}
                  <span className={watchPassword && /[a-z]/.test(watchPassword) ? "text-green-600" : "text-gray-600"}>
                    Uma letra minúscula (a-z)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {watchPassword && /\d/.test(watchPassword) ? (
                    <CheckCircle className="h-3 w-3 text-green-600 flex-shrink-0" />
                  ) : (
                    <XCircle className="h-3 w-3 text-gray-400 flex-shrink-0" />
                  )}
                  <span className={watchPassword && /\d/.test(watchPassword) ? "text-green-600" : "text-gray-600"}>
                    Um número (0-9)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {watchPassword && /[!@#$%^&*(),.?":{}|<>]/.test(watchPassword) ? (
                    <CheckCircle className="h-3 w-3 text-green-600 flex-shrink-0" />
                  ) : (
                    <XCircle className="h-3 w-3 text-gray-400 flex-shrink-0" />
                  )}
                  <span className={watchPassword && /[!@#$%^&*(),.?":{}|<>]/.test(watchPassword) ? "text-green-600" : "text-gray-600"}>
                    Um caractere especial (!@#$%^&*...)
                  </span>
                </div>
              </div>
              {watchPassword && (
                <div className="space-y-2">
                  <Progress value={strengthScore} className="h-2" />
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Força da senha:</span>
                    <span className={
                      strengthScore < 40 ? "text-red-500 font-medium" : 
                      strengthScore < 80 ? "text-yellow-500 font-medium" : 
                      "text-green-500 font-medium"
                    }>
                      {strengthScore < 40 ? "Fraca" : 
                       strengthScore < 80 ? "Média" : 
                       "Forte"}
                    </span>
                  </div>
                </div>
              )}
            </div>
            {errors.senha && (
              <p className="text-sm text-destructive">
                {errors.senha.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmSenha">Confirmar senha</Label>
            <div className="relative">
              <Input
                id="confirmSenha"
                type={showConfirmPassword ? "text" : "password"}
                placeholder="••••••••"
                {...register("confirmSenha")}
                disabled={isLoading}
                className={` ${errors.confirmSenha ? "border-destructive" : ""}`}
              />
          
            </div>
            {errors.confirmSenha && (
              <p className="text-sm text-destructive">
                {errors.confirmSenha.message}
              </p>
            )}
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={isLoading || !passwordStrength.isValid}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Criando conta...
              </>
            ) : (
              <>
                <UserPlus className="mr-2 h-4 w-4" />
                Criar conta
              </>
            )}
          </Button>
        </form>

        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            Já tem uma conta?{" "}
            <Button
              variant="link"
              className="p-0 h-auto text-sm"
              onClick={onToggleMode}
              disabled={isLoading}
            >
              <LogIn className="mr-1 h-3 w-3" />
              Fazer login
            </Button>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}