"use client";

import { useState } from "react";
import { LoginForm } from "@/src/components/auth/LoginForm";
import { RegisterForm } from "@/src/components/auth/RegisterForm";

/**
 * Página de autenticação admin - Login e Registro
 */
export default function AdminAuthPage() {
  const [isRegisterMode, setIsRegisterMode] = useState(false);

  const toggleMode = () => {
    setIsRegisterMode(!isRegisterMode);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/50 to-muted flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="backdrop-blur-sm bg-card/95 border rounded-xl p-1 shadow-2xl">
          {isRegisterMode ? (
            <RegisterForm onToggleMode={toggleMode} />
          ) : (
            <LoginForm 
              onToggleMode={toggleMode} 
              isRegisterMode={isRegisterMode} 
            />
          )}
        </div>
      </div>
    </div>
  );
}