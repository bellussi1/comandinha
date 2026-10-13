import {
  formatarDataHora,
  formatarDataCompleta,
  formatarHora,
  formatarMoeda,
  formatarDataRelativa,
} from '../formatters';

describe('formatters', () => {
  describe('formatarDataHora', () => {
    it('deve formatar data ISO para formato brasileiro', () => {
      const dataISO = '2024-01-15T14:30:00.000Z';
      const resultado = formatarDataHora(dataISO);

      // Resultado deve conter dia, mês, hora e minuto
      expect(resultado).toMatch(/\d{2}\/\d{2}/); // DD/MM
      expect(resultado).toMatch(/\d{2}:\d{2}/); // HH:mm
    });

    it('deve lidar com diferentes timezones', () => {
      const dataISO = '2024-12-25T00:00:00.000Z';
      const resultado = formatarDataHora(dataISO);

      expect(resultado).toBeTruthy();
      expect(typeof resultado).toBe('string');
    });
  });

  describe('formatarDataCompleta', () => {
    it('deve formatar data com ano', () => {
      const dataISO = '2024-01-15T14:30:00.000Z';
      const resultado = formatarDataCompleta(dataISO);

      // Deve incluir ano
      expect(resultado).toMatch(/\d{2}\/\d{2}\/\d{2}/); // DD/MM/YY
      expect(resultado).toMatch(/\d{2}:\d{2}/); // HH:mm
    });
  });

  describe('formatarHora', () => {
    it('deve formatar apenas hora e minuto', () => {
      const dataISO = '2024-01-15T14:30:00.000Z';
      const resultado = formatarHora(dataISO);

      expect(resultado).toMatch(/\d{2}:\d{2}/);
      expect(resultado).not.toMatch(/\d{2}\/\d{2}/); // Não deve conter data
    });

    it('deve formatar meia-noite corretamente', () => {
      const dataISO = '2024-01-15T00:00:00.000Z';
      const resultado = formatarHora(dataISO);

      expect(resultado).toBeTruthy();
      expect(typeof resultado).toBe('string');
    });

    it('deve formatar meio-dia corretamente', () => {
      const dataISO = '2024-01-15T12:00:00.000Z';
      const resultado = formatarHora(dataISO);

      expect(resultado).toBeTruthy();
      expect(typeof resultado).toBe('string');
    });
  });

  describe('formatarMoeda', () => {
    it('deve formatar valor inteiro com centavos', () => {
      const resultado = formatarMoeda(10);
      expect(resultado).toBe('R$ 10,00');
    });

    it('deve formatar valor com centavos', () => {
      const resultado = formatarMoeda(25.90);
      expect(resultado).toBe('R$ 25,90');
    });

    it('deve formatar zero corretamente', () => {
      const resultado = formatarMoeda(0);
      expect(resultado).toBe('R$ 0,00');
    });

    it('deve formatar valores grandes', () => {
      const resultado = formatarMoeda(1234.56);
      expect(resultado).toBe('R$ 1234,56');
    });

    it('deve formatar valores negativos', () => {
      const resultado = formatarMoeda(-50.25);
      expect(resultado).toBe('R$ -50,25');
    });

    it('deve arredondar para 2 casas decimais', () => {
      const resultado = formatarMoeda(10.999);
      expect(resultado).toBe('R$ 11,00');
    });

    it('deve formatar valores muito pequenos', () => {
      const resultado = formatarMoeda(0.01);
      expect(resultado).toBe('R$ 0,01');
    });
  });

  describe('formatarDataRelativa', () => {
    beforeEach(() => {
      // Mock da data atual para testes consistentes
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-01-15T12:00:00.000Z'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('deve retornar "Hoje" para data de hoje', () => {
      const dataISO = '2024-01-15T10:30:00.000Z';
      const resultado = formatarDataRelativa(dataISO);

      expect(resultado).toContain('Hoje');
      expect(resultado).toMatch(/\d{2}:\d{2}/); // Deve incluir hora
    });

    it('deve retornar "Ontem" para data de ontem', () => {
      const dataISO = '2024-01-14T10:30:00.000Z';
      const resultado = formatarDataRelativa(dataISO);

      expect(resultado).toContain('Ontem');
      expect(resultado).toMatch(/\d{2}:\d{2}/); // Deve incluir hora
    });

    it('deve retornar data completa para datas antigas', () => {
      const dataISO = '2024-01-10T10:30:00.000Z';
      const resultado = formatarDataRelativa(dataISO);

      expect(resultado).not.toContain('Hoje');
      expect(resultado).not.toContain('Ontem');
      expect(resultado).toMatch(/\d{2}\/\d{2}/); // Deve incluir data
    });

    it('deve lidar com diferentes horários do mesmo dia', () => {
      // Manhã do mesmo dia
      const manha = '2024-01-15T06:00:00.000Z';
      expect(formatarDataRelativa(manha)).toContain('Hoje');

      // Tarde do mesmo dia
      const tarde = '2024-01-15T18:00:00.000Z';
      expect(formatarDataRelativa(tarde)).toContain('Hoje');

      // Noite do mesmo dia
      const noite = '2024-01-15T23:59:00.000Z';
      expect(formatarDataRelativa(noite)).toContain('Hoje');
    });
  });
});
