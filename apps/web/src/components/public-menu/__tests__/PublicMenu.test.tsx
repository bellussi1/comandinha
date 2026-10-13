import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ApiPaths } from "@comandinha/api-client";
import * as dining from "../../../services/public-dining";
import { OrderTracking } from "../OrderTracking";
import { PublicMenu } from "../PublicMenu";

type PublicMenuResponse =
  ApiPaths["/public/tables/{code}/menu"]["get"]["responses"][200]["content"]["application/json"];
type CreateOrderPayload =
  ApiPaths["/public/tables/{code}/orders"]["post"]["requestBody"]["content"]["application/json"];
type PublicOrderResponse =
  ApiPaths["/public/tables/{code}/orders"]["post"]["responses"][201]["content"]["application/json"];
type PublicOrderSummary =
  ApiPaths["/public/tables/{code}/orders"]["get"]["responses"][200]["content"]["application/json"][number];

const tableCode = "A".repeat(43);
const otherTableCode = "B".repeat(43);
const burgerId = "0f7b1db9-cba9-4d4b-a5ea-ae798e56b53a";
const teaId = "f2d9a989-21f1-42c8-a110-74a1c12ccf24";
const orderId = "ad97f868-d026-4ca8-a765-dd34acdb643f";
const otherOrderId = "dc50d663-70e7-4601-8e18-71e889dcc58d";

const menu: PublicMenuResponse = {
  restaurant: { name: "Casa do Enzo" },
  table: { name: "Mesa 01" },
  categories: [
    {
      id: "82e80217-0035-4da6-9e6f-76221a172fda",
      name: "Lanches",
      description: "Feitos na hora.",
      products: [
        {
          id: burgerId,
          name: "Smash clássico",
          description: "Pão, carne e queijo.",
          priceInCents: 2990,
          imageUrl: null,
          featured: true,
          dietaryTags: [],
          prepTimeMinutes: 12,
        },
      ],
    },
    {
      id: "02b35e28-760d-4558-94c5-4e0b9244be6b",
      name: "Bebidas",
      description: null,
      products: [
        {
          id: teaId,
          name: "Chá gelado",
          description: null,
          priceInCents: 990,
          imageUrl: null,
          featured: false,
          dietaryTags: ["vegano"],
          prepTimeMinutes: null,
        },
      ],
    },
  ],
};

const createdOrder: PublicOrderResponse = {
  id: orderId,
  status: "PENDING",
  totalInCents: 2990,
  createdAt: "2026-10-13T12:00:00.000Z",
  items: [
    {
      nameSnapshot: "Smash clássico",
      quantity: 1,
      unitPriceInCents: 2990,
      lineTotalInCents: 2990,
    },
  ],
};

const pendingSummary: PublicOrderSummary = {
  ...createdOrder,
};

jest.mock("../../../services/public-dining", () => ({
  getPublicMenu: jest.fn(),
  submitPublicOrder: jest.fn(),
  listPublicOrderSummaries: jest.fn(),
}));

const service = jest.mocked(dining);

function renderMenu(code = tableCode) {
  return render(<PublicMenu code={code} />);
}

function setVisible(visibility: DocumentVisibilityState) {
  Object.defineProperty(document, "visibilityState", {
    configurable: true,
    value: visibility,
  });
}

describe("PublicMenu", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    localStorage.clear();
    setVisible("visible");
    service.getPublicMenu.mockResolvedValue(menu);
    service.submitPublicOrder.mockResolvedValue(createdOrder);
    service.listPublicOrderSummaries.mockResolvedValue([pendingSummary]);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("loads categories, filters the menu and calculates cart totals from server prices", async () => {
    const user = userEvent.setup();
    renderMenu();

    expect(await screen.findByRole("heading", { name: "Casa do Enzo" })).toBeInTheDocument();
    expect(screen.getByText("Mesa 01")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Bebidas" }));
    expect(screen.getByRole("heading", { name: "Chá gelado" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Smash clássico" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Todas" }));
    await user.click(screen.getByRole("button", { name: "Adicionar Smash clássico ao carrinho" }));
    await user.click(screen.getByRole("button", { name: /Abrir carrinho/ }));

    expect(screen.getByRole("dialog", { name: "Seu carrinho" })).toBeInTheDocument();
    expect(
      screen.getByText("R$ 29,90", { selector: ".public-menu-cart-summary strong" }),
    ).toBeInTheDocument();
    const stored = localStorage.getItem(`comandinha:qr-cart:${tableCode}`);
    expect(stored).toContain(burgerId);
    expect(stored).toContain('"quantity":1');
    expect(stored).not.toContain("priceInCents");
  });

  it("keeps carts separate when the QR code changes", async () => {
    localStorage.setItem(
      `comandinha:qr-cart:${tableCode}`,
      JSON.stringify([{ productId: burgerId, quantity: 2, notes: "Sem cebola" }]),
    );
    const view = renderMenu();

    expect(await screen.findByRole("button", { name: /2 itens/ })).toBeInTheDocument();
    view.unmount();
    const restored = renderMenu();
    expect(await screen.findByRole("button", { name: /2 itens/ })).toBeInTheDocument();
    restored.rerender(<PublicMenu code={otherTableCode} />);
    expect(await screen.findByRole("button", { name: /0 itens/ })).toBeInTheDocument();
    expect(localStorage.getItem(`comandinha:qr-cart:${otherTableCode}`)).toBeNull();
    expect(localStorage.getItem(`comandinha:qr-cart:${tableCode}`)).toContain(burgerId);
  });

  it("refreshes prices from the menu instead of restoring a saved price", async () => {
    localStorage.setItem(
      `comandinha:qr-cart:${tableCode}`,
      JSON.stringify([{ productId: burgerId, quantity: 2 }]),
    );
    service.getPublicMenu.mockResolvedValueOnce({
      ...menu,
      categories: menu.categories.map((category) => ({
        ...category,
        products: category.products.map((product) => ({ ...product, priceInCents: 3490 })),
      })),
    });
    const user = userEvent.setup();
    renderMenu();

    await user.click(await screen.findByRole("button", { name: /2 itens/ }));
    expect(
      screen.getByText("R$ 69,80", { selector: ".public-menu-cart-summary strong" }),
    ).toBeInTheDocument();
    expect(localStorage.getItem(`comandinha:qr-cart:${tableCode}`)).not.toContain("3490");
  });

  it("locks submission while pending and keeps every line after a failed request", async () => {
    let rejectOrder!: (error: Error) => void;
    service.submitPublicOrder.mockReturnValueOnce(
      new Promise((_, reject) => {
        rejectOrder = reject;
      }),
    );
    const user = userEvent.setup();
    renderMenu();
    await user.click(await screen.findByRole("button", { name: "Adicionar Smash clássico ao carrinho" }));
    await user.click(screen.getByRole("button", { name: /Abrir carrinho/ }));
    const submit = screen.getByRole("button", { name: "Enviar pedido" });
    await user.click(submit);

    expect(submit).toBeDisabled();
    expect(service.submitPublicOrder).toHaveBeenCalledWith(tableCode, {
      items: [{ productId: burgerId, quantity: 1 }],
    } satisfies CreateOrderPayload);

    await act(async () => rejectOrder(new Error("Falha temporária")));
    expect(await screen.findByRole("alert")).toHaveTextContent("Falha temporária");
    expect(localStorage.getItem(`comandinha:qr-cart:${tableCode}`)).toContain(burgerId);
    expect(screen.getByRole("button", { name: "Enviar pedido" })).toBeEnabled();
    expect(screen.getByRole("heading", { name: "Smash clássico" })).toBeInTheDocument();
  });

  it("stores the created order id and tracks only that order", async () => {
    service.listPublicOrderSummaries.mockResolvedValueOnce([
      { ...pendingSummary, id: otherOrderId, status: "CANCELLED" },
      pendingSummary,
    ]);
    const user = userEvent.setup();
    renderMenu();
    await user.click(await screen.findByRole("button", { name: "Adicionar Smash clássico ao carrinho" }));
    await user.click(screen.getByRole("button", { name: /Abrir carrinho/ }));
    await user.type(screen.getByLabelText("Observação para Smash clássico"), "Sem cebola");
    await user.click(screen.getByRole("button", { name: "Enviar pedido" }));

    expect(await screen.findByText("Pedido recebido pelo restaurante")).toBeInTheDocument();
    expect(localStorage.getItem(`comandinha:qr-cart:${tableCode}`)).toBeNull();
    expect(localStorage.getItem(`comandinha:qr-last-order:${tableCode}`)).toBe(orderId);
    expect(screen.queryByText("Pedido cancelado")).not.toBeInTheDocument();
    expect(service.submitPublicOrder).toHaveBeenCalledWith(tableCode, {
      items: [{ productId: burgerId, quantity: 1, notes: "Sem cebola" }],
    });
  });

  it("shows loading and a retry action when the menu request fails", async () => {
    service.getPublicMenu.mockReturnValueOnce(new Promise(() => undefined));
    const loading = renderMenu();
    expect(screen.getByRole("status")).toHaveTextContent("Abrindo o cardápio");
    loading.unmount();

    service.getPublicMenu
      .mockRejectedValueOnce(new Error("Cardápio temporariamente indisponível"))
      .mockResolvedValueOnce(menu);
    const user = userEvent.setup();
    renderMenu();

    expect(await screen.findByRole("alert")).toHaveTextContent("Cardápio temporariamente indisponível");
    await user.click(screen.getByRole("button", { name: "Tentar novamente" }));
    expect(await screen.findByRole("heading", { name: "Casa do Enzo" })).toBeInTheDocument();
  });
});

describe("OrderTracking", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    setVisible("visible");
    service.listPublicOrderSummaries.mockResolvedValue([pendingSummary]);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("polls only while visible and stops after a terminal status", async () => {
    jest.useFakeTimers();
    service.listPublicOrderSummaries
      .mockResolvedValueOnce([pendingSummary])
      .mockResolvedValueOnce([{ ...pendingSummary, status: "DELIVERED" }]);
    render(<OrderTracking code={tableCode} orderId={orderId} />);

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(screen.getByText("Pedido recebido pelo restaurante")).toBeInTheDocument();

    await act(async () => {
      await jest.advanceTimersByTimeAsync(10_000);
    });
    expect(await screen.findByText("Pedido entregue")).toBeInTheDocument();

    await act(async () => {
      await jest.advanceTimersByTimeAsync(30_000);
    });
    expect(service.listPublicOrderSummaries).toHaveBeenCalledTimes(2);
  });

  it("does not poll while the page is hidden and resumes when visible", async () => {
    jest.useFakeTimers();
    setVisible("hidden");
    render(<OrderTracking code={tableCode} orderId={orderId} />);
    await act(async () => {
      await jest.advanceTimersByTimeAsync(20_000);
    });
    expect(service.listPublicOrderSummaries).not.toHaveBeenCalled();

    setVisible("visible");
    await act(async () => {
      document.dispatchEvent(new Event("visibilitychange"));
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(service.listPublicOrderSummaries).toHaveBeenCalledTimes(1);
  });

  it("clears its polling timer when the tracking panel unmounts", async () => {
    jest.useFakeTimers();
    const view = render(<OrderTracking code={tableCode} orderId={orderId} />);
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(service.listPublicOrderSummaries).toHaveBeenCalledTimes(1);

    view.unmount();
    await act(async () => {
      await jest.advanceTimersByTimeAsync(30_000);
    });
    expect(service.listPublicOrderSummaries).toHaveBeenCalledTimes(1);
  });
});
