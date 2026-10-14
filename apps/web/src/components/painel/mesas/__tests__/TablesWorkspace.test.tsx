import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ApiPaths } from "@comandinha/api-client";
import * as tables from "../../../../services/panel-tables";
import type {
  PanelDiningSession,
  PanelDiningSessionEnvelope,
} from "../../../../services/panel-tables";
import { PainelSessionProvider } from "../../PainelSessionContext";
import { TablesWorkspace } from "../TablesWorkspace";

type Session =
  ApiPaths["/auth/sessions/current"]["get"]["responses"][200]["content"]["application/json"];
type Table =
  ApiPaths["/tables"]["get"]["responses"][200]["content"]["application/json"][number];

const table: Table = {
  id: "table-1",
  restaurantId: "restaurant-1",
  name: "Mesa 01",
  publicCode: "A".repeat(43),
  isActive: true,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  activeOrderCount: 2,
  currentSession: null,
};

const openDiningSession: PanelDiningSession = {
  id: "d4abcc94-e591-4d8d-980a-056ae9a4b8de",
  restaurantId: table.restaurantId,
  tableId: table.id,
  status: "OPEN",
  openedAt: "2026-10-14T12:00:00.000Z",
  closedAt: null,
  closedTotalInCents: null,
  projectedTotalInCents: 5290,
  nonTerminalOrderCount: 1,
  orders: [
    {
      id: "b6b8600d-a6ef-4c66-8b1b-32e7c79692a3",
      status: "PENDING",
      totalInCents: 5290,
      createdAt: "2026-10-14T12:10:00.000Z",
      items: [
        {
          id: "e9d5a68e-b5ab-4503-bb4e-c7d41b2982e0",
          nameSnapshot: "Smash clássico",
          unitPriceInCents: 5290,
          quantity: 1,
          notes: null,
          lineTotalInCents: 5290,
        },
      ],
    },
  ],
};
const activeTable: Table = {
  ...table,
  currentSession: {
    id: openDiningSession.id,
    openedAt: openDiningSession.openedAt,
    projectedTotalInCents: openDiningSession.projectedTotalInCents,
    nonTerminalOrderCount: openDiningSession.nonTerminalOrderCount,
  },
};

const ownerSession: Session = {
  user: { id: "user-1", name: "Enzo Bellussi", email: "enzo@example.com" },
  restaurant: {
    id: "restaurant-1",
    name: "Casa do Enzo",
    slug: "casa-do-enzo",
  },
  membership: { id: "membership-1", role: "OWNER" },
  expiresAt: "2027-01-01T00:00:00.000Z",
};
const staffSession: Session = {
  ...ownerSession,
  membership: { ...ownerSession.membership, role: "STAFF" },
};

jest.mock(
  "../../../../services/panel-tables",
  () => ({
    listTables: jest.fn(),
    createTable: jest.fn(),
    updateTable: jest.fn(),
    openTableSession: jest.fn(),
    getTableSession: jest.fn(),
    closeTableSession: jest.fn(),
  }),
  { virtual: true },
);

const service = jest.mocked(tables);

function renderWorkspace(session: Session = ownerSession) {
  return render(
    <PainelSessionProvider session={session}>
      <TablesWorkspace />
    </PainelSessionProvider>,
  );
}

describe("TablesWorkspace", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    service.listTables.mockResolvedValue([table]);
    service.createTable.mockResolvedValue({
      ...table,
      id: "table-2",
      name: "Mesa 04",
    });
    service.updateTable.mockResolvedValue(table);
    service.openTableSession.mockResolvedValue(openDiningSession);
    service.getTableSession.mockResolvedValue({
      session: openDiningSession,
    } satisfies PanelDiningSessionEnvelope);
    service.closeTableSession.mockResolvedValue({
      ...openDiningSession,
      status: "CLOSED",
      closedAt: "2026-10-14T13:00:00.000Z",
      closedTotalInCents: 5290,
      nonTerminalOrderCount: 0,
    });
  });

  it("starts an open service from the table card and shows the account", async () => {
    const user = userEvent.setup();
    service.listTables
      .mockResolvedValueOnce([table])
      .mockResolvedValueOnce([activeTable]);
    renderWorkspace();

    expect(await screen.findByText("Livre")).toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: "Iniciar atendimento para Mesa 01" }),
    );

    expect(service.openTableSession).toHaveBeenCalledWith(table.id);
    expect(
      await screen.findByRole("dialog", { name: "Conta da Mesa 01" }),
    ).toBeInTheDocument();
    expect(
      within(
        within(screen.getByRole("dialog", { name: "Conta da Mesa 01" })).getByRole(
          "region",
          { name: "Resumo da conta" },
        ),
      ).getByText("R$ 52,90"),
    ).toBeInTheDocument();
  });

  it("shows a projected total and prevents closing while an order is pending", async () => {
    const user = userEvent.setup();
    service.listTables.mockResolvedValue([activeTable]);
    renderWorkspace();

    expect(await screen.findByText("Em atendimento")).toBeInTheDocument();
    expect(screen.getByText("R$ 52,90")).toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: "Ver conta da Mesa 01" }),
    );

    expect(service.getTableSession).toHaveBeenCalledWith(table.id);
    expect(
      await screen.findByRole("dialog", { name: "Conta da Mesa 01" }),
    ).toBeInTheDocument();
    expect(await screen.findByText(/Smash clássico/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Fechar conta" })).toBeDisabled();
    expect(screen.getByText(/1 pedido ainda precisa ser finalizado/)).toBeInTheDocument();
  });

  it("lets STAFF inspect the account without opening or closing sessions", async () => {
    const user = userEvent.setup();
    service.listTables.mockResolvedValue([activeTable]);
    renderWorkspace(staffSession);

    await user.click(
      await screen.findByRole("button", { name: "Ver conta da Mesa 01" }),
    );

    expect(
      within(
        within(
          await screen.findByRole("dialog", { name: "Conta da Mesa 01" }),
        ).getByRole("region", { name: "Resumo da conta" }),
      ).getByText("R$ 52,90"),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Iniciar atendimento para Mesa 01" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Fechar conta" })).not.toBeInTheDocument();
  });

  it("requires confirmation, closes with the server total and refreshes the table", async () => {
    const user = userEvent.setup();
    const settledSession: PanelDiningSession = {
      ...openDiningSession,
      projectedTotalInCents: 2990,
      nonTerminalOrderCount: 0,
      orders: [
        {
          ...openDiningSession.orders[0]!,
          status: "DELIVERED",
          totalInCents: 2990,
          items: [
            {
              ...openDiningSession.orders[0]!.items[0]!,
              unitPriceInCents: 2990,
              lineTotalInCents: 2990,
            },
          ],
        },
      ],
    };
    service.listTables
      .mockResolvedValueOnce([{ ...activeTable, currentSession: {
        ...activeTable.currentSession!,
        projectedTotalInCents: 2990,
        nonTerminalOrderCount: 0,
      } }])
      .mockResolvedValueOnce([table]);
    service.getTableSession.mockResolvedValue({ session: settledSession });
    service.closeTableSession.mockResolvedValue({
      ...settledSession,
      status: "CLOSED",
      closedAt: "2026-10-14T13:00:00.000Z",
      closedTotalInCents: 2990,
    });
    renderWorkspace();

    await user.click(
      await screen.findByRole("button", { name: "Ver conta da Mesa 01" }),
    );
    await user.click(
      await screen.findByRole("button", { name: "Fechar conta" }),
    );
    expect(
      await screen.findByRole("alertdialog", {
        name: "Encerrar atendimento da Mesa 01?",
      }),
    ).toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: "Confirmar encerramento" }),
    );

    await waitFor(() =>
      expect(service.closeTableSession).toHaveBeenCalledWith(
        openDiningSession.id,
      ),
    );
    expect(
      await screen.findByRole("status"),
    ).toHaveTextContent("Conta encerrada. Total registrado: R$ 29,90.");
    expect(await screen.findByText("Livre")).toBeInTheDocument();
  });

  it("creates and renames tables through the typed service", async () => {
    const user = userEvent.setup();
    service.listTables
      .mockResolvedValueOnce([table])
      .mockResolvedValueOnce([
        table,
        { ...table, id: "table-2", name: "Mesa 04" },
      ])
      .mockResolvedValueOnce([
        { ...table, name: "Salão" },
        { ...table, id: "table-2", name: "Mesa 04" },
      ]);
    service.updateTable.mockResolvedValue({ ...table, name: "Salão" });
    renderWorkspace();

    await user.click(await screen.findByRole("button", { name: "Nova mesa" }));
    await user.type(await screen.findByLabelText("Nome da mesa"), "Mesa 04");
    await user.click(screen.getByRole("button", { name: "Criar mesa" }));
    await waitFor(() =>
      expect(service.createTable).toHaveBeenCalledWith({ name: "Mesa 04" }),
    );

    await user.click(
      await screen.findByRole("button", { name: "Renomear Mesa 01" }),
    );
    const nameInput = await screen.findByLabelText("Nome da mesa");
    await user.clear(nameInput);
    await user.type(nameInput, "Salão");
    await user.click(screen.getByRole("button", { name: "Salvar alterações" }));
    await waitFor(() =>
      expect(service.updateTable).toHaveBeenCalledWith(table.id, {
        name: "Salão",
      }),
    );
    expect(await screen.findByText("Salão")).toBeInTheDocument();
  });

  it("keeps the table editor and name after a failed save, then retries successfully", async () => {
    const user = userEvent.setup();
    const createdTable = { ...table, id: "table-2", name: "Mesa 04" };
    let finishRetry: ((value: Table) => void) | undefined;
    service.listTables
      .mockResolvedValueOnce([table])
      .mockResolvedValueOnce([table, createdTable]);
    service.createTable
      .mockRejectedValueOnce(new Error("Falha temporária ao criar mesa"))
      .mockImplementationOnce(
        () =>
          new Promise<Table>((resolve) => {
            finishRetry = resolve;
          }),
      );
    renderWorkspace();

    await user.click(await screen.findByRole("button", { name: "Nova mesa" }));
    const nameInput = await screen.findByLabelText("Nome da mesa");
    await user.type(nameInput, "Mesa 04");
    await user.click(screen.getByRole("button", { name: "Criar mesa" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Falha temporária ao criar mesa",
    );
    expect(nameInput).toHaveValue("Mesa 04");
    const retryButton = screen.getByRole("button", { name: "Criar mesa" });
    expect(retryButton).toBeEnabled();

    await user.click(retryButton);
    await waitFor(() => expect(retryButton).toBeDisabled());
    expect(service.createTable).toHaveBeenCalledTimes(2);
    expect(nameInput).toHaveValue("Mesa 04");
    await user.keyboard("{Escape}");
    expect(
      screen.getByRole("dialog", { name: "Adicionar mesa" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancelar" })).toBeDisabled();
    expect(finishRetry).toBeDefined();
    finishRetry!(createdTable);

    expect(
      await screen.findByRole("heading", { name: "Mesa 04" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("dialog", { name: "Adicionar mesa" }),
    ).not.toBeInTheDocument();
  });

  it("keeps pending status changes independent for separate tables", async () => {
    const user = userEvent.setup();
    const secondTable: Table = { ...table, id: "table-2", name: "Mesa 02" };
    let finishFirst!: (value: Table) => void;
    service.listTables.mockResolvedValue([table, secondTable]);
    service.updateTable
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            finishFirst = resolve;
          }),
      )
      .mockResolvedValueOnce({ ...secondTable, isActive: false });
    renderWorkspace();

    const firstAction = await screen.findByRole("button", {
      name: "Desativar Mesa 01",
    });
    await user.click(firstAction);
    await user.click(screen.getByRole("button", { name: "Desativar Mesa 02" }));
    expect(firstAction).toBeDisabled();
    await waitFor(() => expect(service.updateTable).toHaveBeenCalledTimes(2));
    expect(firstAction).toBeDisabled();
    await user.click(firstAction);
    expect(service.updateTable).toHaveBeenCalledTimes(2);
    await act(async () => {
      finishFirst({ ...table, isActive: false });
    });
  });

  it("shows loading, empty and retryable error states", async () => {
    service.listTables.mockReturnValueOnce(new Promise(() => undefined));
    const loading = renderWorkspace();
    expect(screen.getByRole("status")).toHaveTextContent("Carregando mesas");
    loading.unmount();

    service.listTables.mockResolvedValueOnce([]);
    renderWorkspace();
    expect(await screen.findByText("Ainda não há mesas")).toBeInTheDocument();

    service.listTables.mockRejectedValueOnce(new Error("Falha de rede"));
    renderWorkspace();
    expect(await screen.findByRole("alert")).toHaveTextContent("Falha de rede");
    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "Tentar novamente" }));
  });

  it("keeps STAFF read-only and still provides access to each table QR", async () => {
    const user = userEvent.setup();
    renderWorkspace(staffSession);

    expect(await screen.findByText("Mesa 01")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Nova mesa" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Renomear Mesa 01" }),
    ).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Ver QR de Mesa 01" }));

    expect(
      await screen.findByRole("dialog", { name: "QR da Mesa 01" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Link público")).toHaveValue(
      `http://localhost/q/${table.publicCode}`,
    );
    expect(screen.getByTitle("QR Code da Mesa 01")).toBeInTheDocument();
  });

  it("loads QR content only after the user requests it", async () => {
    const user = userEvent.setup();
    renderWorkspace();

    expect(await screen.findByText("Mesa 01")).toBeInTheDocument();
    expect(
      screen.queryByRole("dialog", { name: "QR da Mesa 01" }),
    ).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Ver QR de Mesa 01" }));

    expect(
      await screen.findByRole("dialog", { name: "QR da Mesa 01" }),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole("img", { name: "Código QR para Mesa 01" }),
    ).toBeInTheDocument();
  });

  it("copies the public link, downloads SVG QR and preserves active-order visibility", async () => {
    const user = userEvent.setup();
    const writeText = jest.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
    const createObjectURL = jest.fn().mockReturnValue("blob:qr");
    const revokeObjectURL = jest.fn();
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      value: createObjectURL,
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      value: revokeObjectURL,
    });
    const click = jest
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => undefined);
    renderWorkspace();

    expect(
      await screen.findByText("2 pedidos em andamento"),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Ver QR de Mesa 01" }));
    await user.click(
      await screen.findByRole("button", { name: "Copiar link" }),
    );
    await waitFor(() =>
      expect(writeText).toHaveBeenCalledWith(
        `http://localhost/q/${table.publicCode}`,
      ),
    );
    expect(await screen.findByText("Link copiado")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Baixar QR em SVG" }));
    expect(createObjectURL).toHaveBeenCalledWith(
      expect.objectContaining({ type: "image/svg+xml;charset=utf-8" }),
    );
    expect(click).toHaveBeenCalled();
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:qr");
  });

  it("deactivates a table without removing its record", async () => {
    const user = userEvent.setup();
    service.updateTable.mockResolvedValue({ ...table, isActive: false });
    service.listTables
      .mockResolvedValueOnce([table])
      .mockResolvedValueOnce([{ ...table, isActive: false }]);
    renderWorkspace();

    await user.click(
      await screen.findByRole("button", { name: "Desativar Mesa 01" }),
    );
    await waitFor(() =>
      expect(service.updateTable).toHaveBeenCalledWith(table.id, {
        isActive: false,
      }),
    );
    expect(await screen.findByText("Inativa")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Ativar Mesa 01" }),
    ).toBeInTheDocument();
  });
});
