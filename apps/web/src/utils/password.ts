/**
 * Utilitários para validação de senhas no cliente
 * NOTA: Hash de senhas deve ser feito apenas no servidor por segurança
 */
export class PasswordUtils {

  /**
   * Valida força da senha
   */
  static validateStrength(password: string): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (password.length < 8) {
      errors.push("A senha deve ter pelo menos 8 caracteres");
    }

    if (!/[A-Z]/.test(password)) {
      errors.push("A senha deve conter pelo menos uma letra maiúscula");
    }

    if (!/[a-z]/.test(password)) {
      errors.push("A senha deve conter pelo menos uma letra minúscula");
    }

    if (!/\d/.test(password)) {
      errors.push("A senha deve conter pelo menos um número");
    }

    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push("A senha deve conter pelo menos um caractere especial");
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}