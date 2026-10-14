import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ApiPaths } from '@comandinha/api-client';
import * as tables from '../../../../services/panel-tables';
import { PainelSessionProvider } from '../../PainelSessionContext';
import { TablesWorkspace } from '../TablesWorkspace';

type Session = ApiPaths['/auth/sessions/current']['get']['responses'][200]['content']['application/json'];
type Table = ApiPaths['/tables']['get']['responses'][200]['content']['application/json'][number];

const table: Table = {
  id: 'table-1',
  restaurantId: 'restaurant-1',
  name: 'Mesa 01',
  publicCode: 'A'.repeat(43),
  isActive: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  activeOrderCount: 2,
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

jest.mock('../../../../services/panel-tables', () => ({
  listTables: jest.fn(),
  createTable: jest.fn(),
  updateTable: jest.fn(),
}), { virtual: true });

const service = jest.mocked(tables);

function renderWorkspace(session: Session = ownerSession) {
  return render(
    <PainelSessionProvider session={session}>
      <TablesWorkspace />
    </PainelSessionProvider>,
  );
}

describe('TablesWorkspace', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    service.listTables.mockResolvedValue([table]);
    service.createTable.mockResolvedValue({ ...table, id: 'table-2', name: 'Mesa 04' });
    service.updateTable.mockResolvedValue(table);
  });

  it('creates and renames tables through the typed service', async () => {
    const user = userEvent.setup();
    service.listTables
      .mockResolvedValueOnce([table])
      .mockResolvedValueOnce([table, { ...table, id: 'table-2', name: 'Mesa 04' }])
      .mockResolvedValueOnce([{ ...table, name: 'Salão' }, { ...table, id: 'table-2', name: 'Mesa 04' }]);
    service.updateTable.mockResolvedValue({ ...table, name: 'Salão' });
    renderWorkspace();

    await user.click(await screen.findByRole('button', { name: 'Nova mesa' }));
    await user.type(await screen.findByLabelText('Nome da mesa'), 'Mesa 04');
    await user.click(screen.getByRole('button', { name: 'Criar mesa' }));
    await waitFor(() => expect(service.createTable).toHaveBeenCalledWith({ name: 'Mesa 04' }));

    await user.click(await screen.findByRole('button', { name: 'Renomear Mesa 01' }));
    const nameInput = await screen.findByLabelText('Nome da mesa');
    await user.clear(nameInput);
    await user.type(nameInput, 'Salão');
    await user.click(screen.getByRole('button', { name: 'Salvar alterações' }));
    await waitFor(() => expect(service.updateTable).toHaveBeenCalledWith(table.id, { name: 'Salão' }));
    expect(await screen.findByText('Salão')).toBeInTheDocument();
  });

  it('keeps the table editor and name after a failed save, then retries successfully', async () => {
    const user = userEvent.setup();
    const createdTable = { ...table, id: 'table-2', name: 'Mesa 04' };
    let finishRetry: ((value: Table) => void) | undefined;
    service.listTables
      .mockResolvedValueOnce([table])
      .mockResolvedValueOnce([table, createdTable]);
    service.createTable
      .mockRejectedValueOnce(new Error('Falha temporária ao criar mesa'))
      .mockImplementationOnce(() => new Promise<Table>((resolve) => {
        finishRetry = resolve;
      }));
    renderWorkspace();

    await user.click(await screen.findByRole('button', { name: 'Nova mesa' }));
    const nameInput = await screen.findByLabelText('Nome da mesa');
    await user.type(nameInput, 'Mesa 04');
    await user.click(screen.getByRole('button', { name: 'Criar mesa' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Falha temporária ao criar mesa');
    expect(nameInput).toHaveValue('Mesa 04');
    const retryButton = screen.getByRole('button', { name: 'Criar mesa' });
    expect(retryButton).toBeEnabled();

    await user.click(retryButton);
    await waitFor(() => expect(retryButton).toBeDisabled());
    expect(service.createTable).toHaveBeenCalledTimes(2);
    expect(nameInput).toHaveValue('Mesa 04');
    expect(finishRetry).toBeDefined();
    finishRetry!(createdTable);

    expect(await screen.findByRole('heading', { name: 'Mesa 04' })).toBeInTheDocument();
    expect(screen.queryByRole('dialog', { name: 'Adicionar mesa' })).not.toBeInTheDocument();
  });

  it('shows loading, empty and retryable error states', async () => {
    service.listTables.mockReturnValueOnce(new Promise(() => undefined));
    const loading = renderWorkspace();
    expect(screen.getByRole('status')).toHaveTextContent('Carregando mesas');
    loading.unmount();

    service.listTables.mockResolvedValueOnce([]);
    renderWorkspace();
    expect(await screen.findByText('Ainda não há mesas')).toBeInTheDocument();

    service.listTables.mockRejectedValueOnce(new Error('Falha de rede'));
    renderWorkspace();
    expect(await screen.findByRole('alert')).toHaveTextContent('Falha de rede');
    await userEvent.setup().click(screen.getByRole('button', { name: 'Tentar novamente' }));
  });

  it('keeps STAFF read-only and still provides access to each table QR', async () => {
    const user = userEvent.setup();
    renderWorkspace(staffSession);

    expect(await screen.findByText('Mesa 01')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Nova mesa' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Renomear Mesa 01' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Ver QR de Mesa 01' }));

    expect(screen.getByRole('dialog', { name: 'QR da Mesa 01' })).toBeInTheDocument();
    expect(screen.getByLabelText('Link público')).toHaveValue(`http://localhost/q/${table.publicCode}`);
    expect(screen.getByTitle('QR Code da Mesa 01')).toBeInTheDocument();
  });

  it('copies the public link, downloads SVG QR and preserves active-order visibility', async () => {
    const user = userEvent.setup();
    const writeText = jest.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });
    const createObjectURL = jest.fn().mockReturnValue('blob:qr');
    const revokeObjectURL = jest.fn();
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: createObjectURL });
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: revokeObjectURL });
    const click = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    renderWorkspace();

    expect(await screen.findByText('2 pedidos em andamento')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Ver QR de Mesa 01' }));
    await user.click(screen.getByRole('button', { name: 'Copiar link' }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(`http://localhost/q/${table.publicCode}`));
    expect(await screen.findByText('Link copiado')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Baixar QR em SVG' }));
    expect(createObjectURL).toHaveBeenCalledWith(expect.objectContaining({ type: 'image/svg+xml;charset=utf-8' }));
    expect(click).toHaveBeenCalled();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:qr');
  });

  it('deactivates a table without removing its record', async () => {
    const user = userEvent.setup();
    service.updateTable.mockResolvedValue({ ...table, isActive: false });
    service.listTables
      .mockResolvedValueOnce([table])
      .mockResolvedValueOnce([{ ...table, isActive: false }]);
    renderWorkspace();

    await user.click(await screen.findByRole('button', { name: 'Desativar Mesa 01' }));
    await waitFor(() => expect(service.updateTable).toHaveBeenCalledWith(table.id, { isActive: false }));
    expect(await screen.findByText('Inativa')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ativar Mesa 01' })).toBeInTheDocument();
  });
});
