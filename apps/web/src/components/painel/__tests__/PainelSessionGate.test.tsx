import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PainelSessionGate } from "../PainelSessionGate";

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

describe("PainelSessionGate", () => {
  it("redirects an invalid session to the panel login without rendering protected content", async () => {
    fetchMock.mockResolvedValue(jsonResponse({}, 401));
    render(
      <PainelSessionGate>
        <p>Conteúdo protegido</p>
      </PainelSessionGate>,
    );

    await waitFor(() =>
      expect(mockRouter.replace).toHaveBeenCalledWith("/painel/login"),
    );
    expect(screen.queryByText("Conteúdo protegido")).not.toBeInTheDocument();
  });

  it("renders safe membership metadata after the session is validated", async () => {
    fetchMock.mockResolvedValue(jsonResponse(safeSession));
    render(
      <PainelSessionGate>
        <p>Conteúdo protegido</p>
      </PainelSessionGate>,
    );

    expect(await screen.findAllByText("Casa do Enzo")).toHaveLength(2);
    expect(screen.getByText("Enzo Bellussi")).toBeInTheDocument();
    expect(screen.getByText("Conteúdo protegido")).toBeInTheDocument();
    expect(screen.queryByText(/sessionToken/i)).not.toBeInTheDocument();
  });

  it("shows a retryable outage state without redirecting or dropping the session", async () => {
    const user = userEvent.setup();
    fetchMock
      .mockResolvedValueOnce(jsonResponse({}, 503))
      .mockResolvedValueOnce(jsonResponse(safeSession));
    render(
      <PainelSessionGate>
        <p>Conteúdo protegido</p>
      </PainelSessionGate>,
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Não foi possível validar sua sessão agora.",
    );
    expect(mockRouter.replace).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Tentar novamente" }));
    expect(await screen.findByText("Conteúdo protegido")).toBeInTheDocument();
  });

  it("revokes the session through the same-origin route before returning to login", async () => {
    const user = userEvent.setup();
    fetchMock
      .mockResolvedValueOnce(jsonResponse(safeSession))
      .mockResolvedValueOnce({ status: 204, ok: true } as Response);
    render(
      <PainelSessionGate>
        <p>Conteúdo protegido</p>
      </PainelSessionGate>,
    );

    await user.click(
      (await screen.findAllByRole("button", { name: "Sair" }))[0],
    );

    await waitFor(() =>
      expect(mockRouter.replace).toHaveBeenCalledWith("/painel/login"),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "/api/auth/session",
      expect.objectContaining({ method: "DELETE" }),
    );
  });
});
