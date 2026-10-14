import { STORAGE_KEYS } from "../constants";

export const TokenManager = {
  getToken: (mesa: string): string | null => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(`${STORAGE_KEYS.TOKEN_PREFIX}${mesa}`);
  },
  
  setToken: (mesa: string, token: string): void => {
    if (typeof window === "undefined") return;
    localStorage.setItem(`${STORAGE_KEYS.TOKEN_PREFIX}${mesa}`, token);
  },
  
  removeToken: (mesa: string): void => {
    if (typeof window === "undefined") return;
    localStorage.removeItem(`${STORAGE_KEYS.TOKEN_PREFIX}${mesa}`);
  },

  getAllTokens: (): { [mesa: string]: string } => {
    if (typeof window === "undefined") return {};
    
    const tokens: { [mesa: string]: string } = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(STORAGE_KEYS.TOKEN_PREFIX)) {
        const mesa = key.replace(STORAGE_KEYS.TOKEN_PREFIX, "");
        const token = localStorage.getItem(key);
        if (token) {
          tokens[mesa] = token;
        }
      }
    }
    
    return tokens;
  }
}; 