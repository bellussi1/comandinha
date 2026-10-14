import { render, screen } from '@testing-library/react';
import { StatusBadge } from '../status/StatusBadge';

// Mock do módulo de fechamento
jest.mock('@/src/services/fechamento', () => ({
  getDisplayText: (status: string) => {
    const displayTexts: Record<string, string> = {
      pendente: 'Pendente',
      'em preparo': 'Em preparo',
      entregue: 'Entregue',
      concluido: 'Concluído',
    };
    return displayTexts[status.toLowerCase()] || status;
  },
}));

describe('StatusBadge', () => {
  it('deve renderizar badge com status pendente', () => {
    render(<StatusBadge status="pendente" />);
    expect(screen.getByText('Pendente')).toBeInTheDocument();
  });

  it('deve renderizar badge com status em preparo', () => {
    render(<StatusBadge status="em preparo" />);
    expect(screen.getByText('Em preparo')).toBeInTheDocument();
  });

  it('deve renderizar badge com status entregue', () => {
    render(<StatusBadge status="entregue" />);
    expect(screen.getByText('Entregue')).toBeInTheDocument();
  });

  it('deve renderizar badge com status concluído', () => {
    render(<StatusBadge status="concluido" />);
    expect(screen.getByText('Concluído')).toBeInTheDocument();
  });

  it('deve aplicar classe correta para status pendente', () => {
    const { container } = render(<StatusBadge status="pendente" />);
    const badge = container.querySelector('.bg-blue-500');
    expect(badge).toBeInTheDocument();
  });

  it('deve aplicar classe correta para status em preparo', () => {
    const { container } = render(<StatusBadge status="em preparo" />);
    const badge = container.querySelector('.bg-orange-500');
    expect(badge).toBeInTheDocument();
  });

  it('deve aplicar classe correta para status entregue', () => {
    const { container } = render(<StatusBadge status="entregue" />);
    const badge = container.querySelector('.bg-green-500');
    expect(badge).toBeInTheDocument();
  });

  it('deve aplicar classe correta para status concluído', () => {
    const { container } = render(<StatusBadge status="concluido" />);
    const badge = container.querySelector('.bg-slate-500');
    expect(badge).toBeInTheDocument();
  });

  it('deve renderizar com variant outline para status desconhecido', () => {
    render(<StatusBadge status="status-invalido" />);
    expect(screen.getByText('status-invalido')).toBeInTheDocument();
  });

  it('deve ser case-insensitive para status', () => {
    render(<StatusBadge status="PENDENTE" />);
    expect(screen.getByText('Pendente')).toBeInTheDocument();
  });

  it('deve lidar corretamente com capitalização mista', () => {
    render(<StatusBadge status="Em Preparo" />);
    expect(screen.getByText('Em preparo')).toBeInTheDocument();
  });
});
