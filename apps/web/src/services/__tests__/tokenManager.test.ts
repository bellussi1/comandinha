import { TokenManager } from '../tokenManager';
import { STORAGE_KEYS } from '../../constants';

describe('TokenManager', () => {
  beforeEach(() => {
    // Limpar localStorage antes de cada teste
    localStorage.clear();
    jest.clearAllMocks();
  });

  describe('getToken', () => {
    it('deve retornar null quando não há token armazenado', () => {
      const result = TokenManager.getToken('mesa1');
      expect(result).toBeNull();
    });

    it('deve retornar o token armazenado para a mesa específica', () => {
      const mesa = 'mesa1';
      const token = 'token123';
      localStorage.setItem(`${STORAGE_KEYS.TOKEN_PREFIX}${mesa}`, token);

      const result = TokenManager.getToken(mesa);
      expect(result).toBe(token);
    });

    it('deve retornar null para mesa diferente', () => {
      localStorage.setItem(`${STORAGE_KEYS.TOKEN_PREFIX}mesa1`, 'token123');

      const result = TokenManager.getToken('mesa2');
      expect(result).toBeNull();
    });
  });

  describe('setToken', () => {
    it('deve armazenar o token corretamente', () => {
      const mesa = 'mesa1';
      const token = 'token123';

      TokenManager.setToken(mesa, token);

      expect(localStorage.getItem(`${STORAGE_KEYS.TOKEN_PREFIX}${mesa}`)).toBe(token);
    });

    it('deve sobrescrever token existente', () => {
      const mesa = 'mesa1';
      const oldToken = 'oldToken';
      const newToken = 'newToken';

      TokenManager.setToken(mesa, oldToken);
      TokenManager.setToken(mesa, newToken);

      expect(localStorage.getItem(`${STORAGE_KEYS.TOKEN_PREFIX}${mesa}`)).toBe(newToken);
    });
  });

  describe('removeToken', () => {
    it('deve remover o token da mesa específica', () => {
      const mesa = 'mesa1';
      const token = 'token123';
      localStorage.setItem(`${STORAGE_KEYS.TOKEN_PREFIX}${mesa}`, token);

      TokenManager.removeToken(mesa);

      expect(localStorage.getItem(`${STORAGE_KEYS.TOKEN_PREFIX}${mesa}`)).toBeNull();
    });

    it('não deve afetar outras mesas', () => {
      localStorage.setItem(`${STORAGE_KEYS.TOKEN_PREFIX}mesa1`, 'token1');
      localStorage.setItem(`${STORAGE_KEYS.TOKEN_PREFIX}mesa2`, 'token2');

      TokenManager.removeToken('mesa1');

      expect(localStorage.getItem(`${STORAGE_KEYS.TOKEN_PREFIX}mesa1`)).toBeNull();
      expect(localStorage.getItem(`${STORAGE_KEYS.TOKEN_PREFIX}mesa2`)).toBe('token2');
    });
  });

  describe('getAllTokens', () => {
    it('deve retornar objeto vazio quando não há tokens', () => {
      const result = TokenManager.getAllTokens();
      expect(result).toEqual({});
    });

    it('deve retornar todos os tokens de mesas', () => {
      localStorage.setItem(`${STORAGE_KEYS.TOKEN_PREFIX}mesa1`, 'token1');
      localStorage.setItem(`${STORAGE_KEYS.TOKEN_PREFIX}mesa2`, 'token2');
      localStorage.setItem(`${STORAGE_KEYS.TOKEN_PREFIX}mesa3`, 'token3');

      const result = TokenManager.getAllTokens();

      expect(result).toEqual({
        mesa1: 'token1',
        mesa2: 'token2',
        mesa3: 'token3',
      });
    });

    it('deve ignorar items que não são tokens de mesa', () => {
      localStorage.setItem(`${STORAGE_KEYS.TOKEN_PREFIX}mesa1`, 'token1');
      localStorage.setItem('outra-chave', 'valor');
      localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, 'admin-token');

      const result = TokenManager.getAllTokens();

      expect(result).toEqual({
        mesa1: 'token1',
      });
    });
  });
});
