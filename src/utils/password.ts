import bcrypt from "bcryptjs";

/**
 * Utilitários para hash e validação de senhas
 */
export class PasswordUtils {
  private static readonly SALT_ROUNDS = 12;

  /**
   * Cria hash da senha
   */
  static async hash(password: string): Promise<string> {
    try {
      const salt = await bcrypt.genSalt(this.SALT_ROUNDS);
      return await bcrypt.hash(password, salt);
    } catch (error) {
      console.error("Erro ao criar hash da senha:", error);
      throw new Error("Erro interno do servidor");
    }
  }

  /**
   * Verifica se a senha corresponde ao hash
   */
  static async verify(password: string, hash: string): Promise<boolean> {
    try {
      return await bcrypt.compare(password, hash);
    } catch (error) {
      console.error("Erro ao verificar senha:", error);
      return false;
    }
  }

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