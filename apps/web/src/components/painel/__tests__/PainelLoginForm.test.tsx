import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PainelLoginForm } from "../PainelLoginForm";

const mockRouter = { push: jest.fn(), replace: jest.fn(), refresh: jest.fn() };
const fetchMock = jest.fn() as jest.MockedFunction<typeof fetch>;
const originalFetch = global.fetch;
const safeSession = {
  user: { id: "user-id", name: "Enzo Bellussi", email: "enzo@example.com" },
  restaurant: {
    id: "restaurant-id",
    name: "Casa do Enzo",
    slug: "casa-do-enzo",
  },
  membership: { id: "membership-id", role: "OWNER" },
  expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
};
const sessionToken = "S".repeat(43);

function jsonResponse(body: unknown, status = 200): Response {
  return {
    status,
    ok: status >= 200 && status < 300,
    json: async () => body,
  } as Response;
}

jest.mock("next/navigation", () => ({
  usePathname: () => "/painel",
  useRouter: () => mockRouter,
}));

beforeEach(() => {
  jest.clearAllMocks();
  global.fetch = fetchMock;
});

afterAll(() => {
  global.fetch = originalFetch;
});

describe("PainelLoginForm", () => {
  it("submits credentials only to the same-origin route and never renders the session secret", async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValue(jsonResponse({ ...safeSession, sessionToken }));
    render(<PainelLoginForm />);

    await user.type(screen.getByLabelText("E-mail"), " ENZO@example.com ");
    await user.type(screen.getByLabelText("Senha"), "password-123");
    await user.click(screen.getByRole("button", { name: "Entrar" }));

    await waitFor(() =>
      expect(mockRouter.push).toHaveBeenCalledWith("/painel/catalogo"),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/auth/login",
      expect.objectContaining({
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: "enzo@example.com",
          password: "password-123",
        }),
      }),
    );
    expect(screen.queryByText(sessionToken)).not.toBeInTheDocument();
  });

  it.each([
    [401, "E-mail ou senha inválidos."],
    [429, "Muitas tentativas. Tente novamente em instantes."],
    [503, "O serviço está indisponível. Tente novamente em instantes."],
  ])("shows a safe message for login status %i", async (status, message) => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValue(
      jsonResponse({ message: "internal details" }, status),
    );
    render(<PainelLoginForm />);

    await user.type(screen.getByLabelText("E-mail"), "enzo@example.com");
    await user.type(screen.getByLabelText("Senha"), "wrong-password");
    await user.click(screen.getByRole("button", { name: "Entrar" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(message);
    expect(screen.getByRole("alert")).not.toHaveTextContent("internal details");
    expect(mockRouter.push).not.toHaveBeenCalled();
  });

  it("asks the user to select a restaurant and resubmits with its slug", async () => {
    const user = userEvent.setup();
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse(
          {
            code: "RESTAURANT_SELECTION_REQUIRED",
            memberships: [
              {
                membershipId: "membership-id",
                role: "OWNER",
                restaurant: {
                  id: "restaurant-id",
                  name: "Casa do Enzo",
                  slug: "casa-do-enzo",
                },
              },
            ],
          },
          409,
        ),
      )
      .mockResolvedValueOnce(jsonResponse(safeSession));
    render(<PainelLoginForm />);

    await user.type(screen.getByLabelText("E-mail"), "enzo@example.com");
    await user.type(screen.getByLabelText("Senha"), "password-123");
    await user.click(screen.getByRole("button", { name: "Entrar" }));

    const restaurantSelect = await screen.findByLabelText("Restaurante");
    await user.selectOptions(restaurantSelect, "casa-do-enzo");
    await user.click(screen.getByRole("button", { name: "Continuar" }));

    await waitFor(() =>
      expect(mockRouter.push).toHaveBeenCalledWith("/painel/catalogo"),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "/api/auth/login",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          email: "enzo@example.com",
          password: "password-123",
          restaurantSlug: "casa-do-enzo",
        }),
      }),
    );
  });
});
