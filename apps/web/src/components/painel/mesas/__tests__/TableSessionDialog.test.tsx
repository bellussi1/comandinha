import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { PanelDiningSession } from "../../../../services/panel-tables";
import type { PanelTable } from "../../../../services/panel-tables";
import { TableSessionDialog } from "../TableSessionDialog";

const table: PanelTable = {
  id: "3c4e6ef9-7a30-4420-8c87-50f29c3df224",
  restaurantId: "7479b05b-08b2-4c41-9bb7-59075e3cbda4",
  name: "Mesa 08",
  publicCode: "A".repeat(43),
  isActive: true,
  createdAt: "2026-10-14T12:00:00.000Z",
  updatedAt: "2026-10-14T12:00:00.000Z",
  activeOrderCount: 0,
  currentSession: null,
};

const session: PanelDiningSession = {
  id: "d4abcc94-e591-4d8d-980a-056ae9a4b8de",
  restaurantId: table.restaurantId,
  tableId: table.id,
  status: "OPEN",
  openedAt: "2026-10-14T12:00:00.000Z",
  closedAt: null,
  closedTotalInCents: null,
  projectedTotalInCents: 2990,
  nonTerminalOrderCount: 0,
  orders: [
    {
      id: "b6b8600d-a6ef-4c66-8b1b-32e7c79692a3",
      status: "DELIVERED",
      totalInCents: 2990,
      createdAt: "2026-10-14T12:10:00.000Z",
      items: [
        {
          id: "e9d5a68e-b5ab-4503-bb4e-c7d41b2982e0",
          nameSnapshot: "Smash clássico",
          unitPriceInCents: 2990,
          quantity: 1,
          notes: null,
          lineTotalInCents: 2990,
        },
      ],
    },
  ],
};

function renderSessionDialog(onConfirmClose = jest.fn()) {
  return {
    onConfirmClose,
    ...render(
      <TableSessionDialog
        canManage
        error={null}
        isClosing={false}
        isLoading={false}
        onConfirmClose={onConfirmClose}
        onOpenChange={jest.fn()}
        onRetry={jest.fn()}
        open
        session={session}
        table={table}
      />,
    ),
  };
}

describe("TableSessionDialog", () => {
  it("requires explicit confirmation before closing an eligible account", async () => {
    const user = userEvent.setup();
    const { onConfirmClose } = renderSessionDialog();

    await user.click(screen.getByRole("button", { name: "Fechar conta" }));
    expect(
      screen.getByRole("alertdialog", { name: "Encerrar atendimento da Mesa 08?" }),
    ).toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: "Confirmar encerramento" }),
    );

    expect(onConfirmClose).toHaveBeenCalledTimes(1);
  });
});
