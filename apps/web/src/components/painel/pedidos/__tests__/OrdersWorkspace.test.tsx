import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ApiPaths } from '@comandinha/api-client';
import * as orders from '../../../../services/panel-orders';
import { PainelSessionProvider } from '../../PainelSessionContext';
import { OrdersWorkspace } from '../OrdersWorkspace';

type Session = ApiPaths['/auth/sessions/current']['get']['responses'][200]['content']['application/json'];
type Order = ApiPaths['/orders']['get']['responses'][200]['content']['application/json'][number];

const order: Order = {
  id: 'order-1',
  restaurantId: 'restaurant-1',
  tableId: 'table-1',
  status: 'PENDING',
  notes: null,
  totalInCents: 5190,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  table: { id: 'table-1', name: 'Mesa 01' },
  items: [
    {
      id: 'item-1',
      nameSnapshot: 'Smash clássico',
      unitPriceInCents: 2990,
      quantity: 1,
      notes: null,
      lineTotalInCents: 2990,
    },
  ],
};

const ownerSession: Session = {
  user: { id: 'user-1', name: 'Enzo Bellussi', email: 'enzo@example.com' },
  restaurant: { id: 'restaurant-1', name: 'Casa do Enzo', slug: 'casa-do-enzo' },
  membership: { id: 'membership-1', role: 'OWNER' },
  expiresAt: '2027-01-01T00:00:00.000Z',
};
const staffSession: Session = {
  ...ownerSession,
  membership: { ...ownerSession.membership, role: 'STAFF' },
};

jest.mock('../../../../services/panel-orders', () => ({
  listOrders: jest.fn(),
  updateOrderStatus: jest.fn(),
}), { virtual: true });

const service = jest.mocked(orders);

function renderWorkspace(session: Session = ownerSession) {
  return render(
    <PainelSessionProvider session={session}>
      <OrdersWorkspace />
    </PainelSessionProvider>,
  );
}

describe('OrdersWorkspace', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    service.listOrders.mockResolvedValue([order]);
    service.updateOrderStatus.mockResolvedValue({ ...order, status: 'PREPARING' });
  });

  it('loads, filters and advances only valid order transitions for STAFF', async () => {
    const user = userEvent.setup();
    service.listOrders
      .mockResolvedValueOnce([order])
      .mockResolvedValueOnce([order])
      .mockResolvedValueOnce([order])
      .mockResolvedValueOnce([{ ...order, status: 'PREPARING' }]);
    service.updateOrderStatus.mockResolvedValue({ ...order, status: 'PREPARING' });
    renderWorkspace(staffSession);

    expect(await screen.findByText('Smash clássico')).toBeInTheDocument();
    expect(screen.getByText('R$ 51,90')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Preparando' }));
    await waitFor(() => expect(service.listOrders).toHaveBeenLastCalledWith('PREPARING'));

    await user.click(screen.getByRole('button', { name: 'Todos' }));
    await user.click(await screen.findByRole('button', { name: 'Iniciar preparo do pedido da Mesa 01' }));
    await waitFor(() => expect(service.updateOrderStatus).toHaveBeenCalledWith('order-1', 'PREPARING'));
    expect(await screen.findByRole('button', { name: 'Marcar pedido da Mesa 01 como pronto' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Entregar pedido da Mesa 01' })).not.toBeInTheDocument();
  });

  it('keeps the order and allows retry after a failed status update', async () => {
    const user = userEvent.setup();
    const preparingOrder = { ...order, status: 'PREPARING' as const };
    let finishRetry: ((value: Order) => void) | undefined;
    service.listOrders
      .mockResolvedValueOnce([order])
      .mockResolvedValueOnce([preparingOrder]);
    service.updateOrderStatus
      .mockRejectedValueOnce(new Error('Falha temporária ao atualizar pedido'))
      .mockImplementationOnce(() => new Promise<Order>((resolve) => {
        finishRetry = resolve;
      }));
    renderWorkspace();

    const retryButton = await screen.findByRole('button', {
      name: 'Iniciar preparo do pedido da Mesa 01',
    });
    await user.click(retryButton);

    expect(await screen.findByRole('alert')).toHaveTextContent('Falha temporária ao atualizar pedido');
    expect(screen.getByRole('heading', { name: 'Mesa 01' })).toBeInTheDocument();
    expect(screen.getByText('Pendente')).toBeInTheDocument();
    expect(retryButton).toBeEnabled();

    await user.click(retryButton);
    await waitFor(() => expect(retryButton).toBeDisabled());
    expect(service.updateOrderStatus).toHaveBeenCalledTimes(2);
    expect(screen.getByRole('heading', { name: 'Mesa 01' })).toBeInTheDocument();
    expect(screen.getByText('Pendente')).toBeInTheDocument();
    expect(finishRetry).toBeDefined();
    finishRetry!(preparingOrder);

    expect(await screen.findByText('Em preparo')).toBeInTheDocument();
  });

  it('renders loading, empty and recoverable error states', async () => {
    service.listOrders.mockReturnValueOnce(new Promise(() => undefined));
    const loading = renderWorkspace();
    expect(screen.getByRole('status')).toHaveTextContent('Carregando pedidos');
    loading.unmount();

    service.listOrders.mockResolvedValueOnce([]);
    renderWorkspace();
    expect(await screen.findByText('Nenhum pedido por aqui')).toBeInTheDocument();

    service.listOrders.mockRejectedValueOnce(new Error('API indisponível'));
    renderWorkspace();
    expect(await screen.findByRole('alert')).toHaveTextContent('API indisponível');
    await userEvent.setup().click(screen.getByRole('button', { name: 'Tentar novamente' }));
  });

  it('exposes only legal actions for PREPARING and terminal statuses', async () => {
    const user = userEvent.setup();
    service.listOrders.mockResolvedValueOnce([{ ...order, status: 'PREPARING' }]);
    renderWorkspace();

    expect(await screen.findByRole('button', { name: 'Marcar pedido da Mesa 01 como pronto' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancelar pedido da Mesa 01' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Iniciar preparo do pedido da Mesa 01' })).not.toBeInTheDocument();

    service.listOrders.mockResolvedValueOnce([{ ...order, status: 'DELIVERED' }]);
    await user.click(screen.getByRole('button', { name: 'Entregues' }));
    await waitFor(() => expect(service.listOrders).toHaveBeenLastCalledWith('DELIVERED'));
    expect(screen.queryByRole('button', { name: /pedido da Mesa 01/ })).not.toBeInTheDocument();
  });
});
