import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ApiPaths } from "@comandinha/api-client";
import * as catalog from "@/src/services/catalog";
import { PainelSessionProvider } from "../../PainelSessionContext";
import { CatalogWorkspace } from "../CatalogWorkspace";

type Category = catalog.CatalogCategory;
type Product = catalog.CatalogProduct;
type Session =
  ApiPaths["/auth/sessions/current"]["get"]["responses"][200]["content"]["application/json"];

const category: Category = {
  id: "category-1",
  restaurantId: "restaurant-1",
  name: "Bebidas",
  nameNormalized: "bebidas",
  description: null,
  imageUrl: null,
  displayOrder: 0,
  productCount: 1,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

const product: Product = {
  id: "product-1",
  restaurantId: "restaurant-1",
  categoryId: category.id,
  name: "Suco de laranja",
  description: "Natural e feito na hora",
  priceInCents: 1234,
  imageUrl: null,
  available: true,
  featured: false,
  dietaryTags: [],
  prepTimeMinutes: 5,
  isActive: true,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
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

jest.mock("@/src/services/catalog", () => ({
  ...jest.requireActual("@/src/services/catalog"),
  listCatalogCategories: jest.fn(),
  listCatalogProducts: jest.fn(),
  createCatalogCategory: jest.fn(),
  updateCatalogCategory: jest.fn(),
  removeCatalogCategory: jest.fn(),
  createCatalogProduct: jest.fn(),
  updateCatalogProduct: jest.fn(),
  archiveCatalogProduct: jest.fn(),
}));

const service = jest.mocked(catalog);

function renderWorkspace(session: Session = ownerSession) {
  return render(
    <PainelSessionProvider session={session}>
      <CatalogWorkspace />
    </PainelSessionProvider>,
  );
}

function seedCatalog(products: Product[] = [product]) {
  service.listCatalogCategories.mockResolvedValue([category]);
  service.listCatalogProducts.mockResolvedValue(products);
}

describe("CatalogWorkspace", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("shows a meaningful empty state when the restaurant has no products", async () => {
    seedCatalog([]);
    renderWorkspace();

    expect(
      await screen.findByText("Nenhum produto por aqui"),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Novo produto" })).toBeEnabled();
  });

  it("continues to the first product after creating the first category", async () => {
    const user = userEvent.setup();
    const firstCategory = {
      ...category,
      id: "category-first",
      name: "Lanches",
      nameNormalized: "lanches",
    };
    service.listCatalogCategories.mockResolvedValue([]);
    service.listCatalogProducts.mockResolvedValue([]);
    service.createCatalogCategory.mockResolvedValue(firstCategory);
    renderWorkspace();

    await user.click(
      await screen.findByRole("button", {
        name: "Criar categoria e incluir o primeiro produto",
      }),
    );
    await user.type(screen.getByLabelText("Nome da categoria"), "Lanches");
    await user.click(screen.getByRole("button", { name: "Salvar categoria" }));

    expect(
      await screen.findByRole("heading", { name: "Novo produto" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Categoria")).toHaveValue("category-first");
  });

  it("provides loaded categories to the new product form", async () => {
    const user = userEvent.setup();
    seedCatalog([]);
    renderWorkspace();

    await user.click(
      (await screen.findAllByRole("button", { name: "Novo produto" }))[0],
    );
    expect(screen.getByLabelText("Categoria")).toHaveDisplayValue(
      "Selecione uma categoria",
    );
    expect(
      within(screen.getByLabelText("Categoria")).getByRole("option", {
        name: "Bebidas",
      }),
    ).toBeInTheDocument();
  });

  it("keeps the category editor open while its save is pending", async () => {
    const user = userEvent.setup();
    let finishSave!: (value: Category) => void;
    seedCatalog();
    service.createCatalogCategory.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finishSave = resolve;
        }),
    );
    renderWorkspace();

    await user.click(await screen.findByRole("tab", { name: /Categorias/ }));
    await user.click(screen.getByRole("button", { name: "Nova categoria" }));
    await user.type(screen.getByLabelText("Nome da categoria"), "Lanches");
    await user.click(screen.getByRole("button", { name: "Salvar categoria" }));

    const back = screen.getByRole("button", { name: "Voltar ao catálogo" });
    const backWasDisabled = back.hasAttribute("disabled");
    await user.click(back);
    const editorStayedOpen =
      screen.queryByRole("heading", { name: "Nova categoria" }) !== null;
    await act(async () => {
      finishSave({
        ...category,
        id: "category-2",
        name: "Lanches",
        nameNormalized: "lanches",
      });
    });
    expect(backWasDisabled).toBe(true);
    expect(editorStayedOpen).toBe(true);
    expect(
      await screen.findByRole("button", { name: "Nova categoria" }),
    ).toBeInTheDocument();
  });

  it("keeps the product editor open while its save is pending", async () => {
    const user = userEvent.setup();
    let finishSave!: (value: Product) => void;
    seedCatalog();
    service.createCatalogProduct.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finishSave = resolve;
        }),
    );
    renderWorkspace();

    await user.click(
      await screen.findByRole("button", { name: "Novo produto" }),
    );
    await user.type(screen.getByLabelText("Nome do produto"), "Chá gelado");
    await user.selectOptions(screen.getByLabelText("Categoria"), category.id);
    await user.type(screen.getByPlaceholderText("0,00"), "12,34");
    await user.click(screen.getByRole("button", { name: "Salvar produto" }));

    const back = screen.getByRole("button", { name: "Voltar ao catálogo" });
    const backWasDisabled = back.hasAttribute("disabled");
    await user.click(back);
    const editorStayedOpen =
      screen.queryByRole("heading", { name: "Novo produto" }) !== null;
    await act(async () => {
      finishSave({
        ...product,
        id: "product-2",
        name: "Chá gelado",
        priceInCents: 1234,
      });
    });
    expect(backWasDisabled).toBe(true);
    expect(editorStayedOpen).toBe(true);
    expect(
      await screen.findByRole("button", { name: "Novo produto" }),
    ).toBeInTheDocument();
  });

  it("updates availability through the typed catalog API", async () => {
    const user = userEvent.setup();
    seedCatalog();
    service.updateCatalogProduct.mockResolvedValue({
      ...product,
      available: false,
    });
    service.listCatalogProducts
      .mockResolvedValueOnce([product])
      .mockResolvedValueOnce([{ ...product, available: false }]);
    renderWorkspace();

    await user.click(
      await screen.findByRole("button", {
        name: "Marcar Suco de laranja indisponível",
      }),
    );

    await waitFor(() =>
      expect(service.updateCatalogProduct).toHaveBeenCalledWith(product.id, {
        available: false,
      }),
    );
    expect(await screen.findByText("Indisponível")).toBeInTheDocument();
  });

  it("keeps quick-action locks independent for separate products", async () => {
    const user = userEvent.setup();
    const secondProduct: Product = {
      ...product,
      id: "product-2",
      name: "Chá gelado",
    };
    let finishFirst!: (value: Product) => void;
    let finishSecond!: (value: Product) => void;
    service.listCatalogCategories.mockResolvedValue([category]);
    service.listCatalogProducts.mockResolvedValue([product, secondProduct]);
    service.updateCatalogProduct
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            finishFirst = resolve;
          }),
      )
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            finishSecond = resolve;
          }),
      );
    renderWorkspace();

    const firstAction = await screen.findByRole("button", {
      name: "Marcar Suco de laranja indisponível",
    });
    const secondAction = screen.getByRole("button", {
      name: "Marcar Chá gelado indisponível",
    });
    await user.click(firstAction);
    await user.click(secondAction);
    expect(firstAction).toBeDisabled();
    expect(secondAction).toBeDisabled();

    await act(async () => {
      finishSecond({ ...secondProduct, available: false });
    });
    await waitFor(() => expect(secondAction).toBeEnabled());
    expect(firstAction).toBeDisabled();
    await user.click(firstAction);
    expect(service.updateCatalogProduct).toHaveBeenCalledTimes(2);
    await act(async () => {
      finishFirst({ ...product, available: false });
    });
  });

  it("puts clear labels beside the product quick-action icons", async () => {
    seedCatalog();
    renderWorkspace();

    await screen.findByRole("button", {
      name: "Marcar Suco de laranja indisponível",
    });

    expect(screen.getByText("Pausar", { exact: true })).toBeInTheDocument();
    expect(screen.getByText("Destaque", { exact: true })).toBeInTheDocument();
    expect(screen.getByText("Editar", { exact: true })).toBeInTheDocument();
    expect(screen.getByText("Arquivar", { exact: true })).toBeInTheDocument();
  });

  it("archives and restores a product while showing the archived filter", async () => {
    const user = userEvent.setup();
    const archivedProduct = { ...product, isActive: false };
    seedCatalog();
    service.archiveCatalogProduct.mockResolvedValue(undefined);
    service.updateCatalogProduct.mockResolvedValue({
      ...product,
      isActive: true,
    });
    service.listCatalogProducts
      .mockResolvedValueOnce([product])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([archivedProduct])
      .mockResolvedValueOnce([product]);
    renderWorkspace();

    await user.click(
      await screen.findByRole("button", { name: "Arquivar Suco de laranja" }),
    );
    expect(service.archiveCatalogProduct).toHaveBeenCalledWith(product.id);
    expect(
      await screen.findByText("Nenhum produto por aqui"),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: "Mostrar arquivados" }),
    );
    const restore = await screen.findByRole("button", {
      name: "Restaurar Suco de laranja",
    });
    await user.click(restore);

    await waitFor(() =>
      expect(service.updateCatalogProduct).toHaveBeenCalledWith(product.id, {
        isActive: true,
      }),
    );
    expect(
      await screen.findByRole("button", { name: "Arquivar Suco de laranja" }),
    ).toBeInTheDocument();
  });

  it("explains why a category with products cannot be deleted", async () => {
    const user = userEvent.setup();
    seedCatalog([]);
    service.removeCatalogCategory.mockRejectedValue(
      new catalog.CatalogRequestError(
        "This category still contains products.",
        409,
      ),
    );
    renderWorkspace();

    await user.click(await screen.findByRole("tab", { name: /Categorias/ }));
    await user.click(
      await screen.findByRole("button", { name: "Excluir Bebidas" }),
    );
    await user.click(screen.getByRole("button", { name: "Excluir categoria" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Esta categoria ainda possui produtos.",
    );
    expect(service.removeCatalogCategory).toHaveBeenCalledWith(category.id);
  });

  it("locks category deletion controls while the request is pending", async () => {
    const user = userEvent.setup();
    let finishDelete!: () => void;
    seedCatalog([]);
    service.removeCatalogCategory.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finishDelete = resolve;
        }),
    );
    renderWorkspace();

    await user.click(await screen.findByRole("tab", { name: /Categorias/ }));
    await user.click(
      await screen.findByRole("button", { name: "Excluir Bebidas" }),
    );
    const confirm = screen.getByRole("button", { name: "Excluir categoria" });
    await user.click(confirm);

    expect(service.removeCatalogCategory).toHaveBeenCalledTimes(1);
    expect(confirm).toBeDisabled();
    expect(screen.getByRole("button", { name: "Cancelar" })).toBeDisabled();
    await user.click(confirm);
    expect(service.removeCatalogCategory).toHaveBeenCalledTimes(1);

    await act(async () => {
      finishDelete();
    });
    await waitFor(() =>
      expect(service.removeCatalogCategory).toHaveBeenCalledTimes(1),
    );
  });

  it("keeps STAFF read-only while preserving product visibility", async () => {
    seedCatalog();
    renderWorkspace(staffSession);

    expect(await screen.findByText("Suco de laranja")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Novo produto" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("tab", { name: /Categorias/ }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", {
        name: "Marcar Suco de laranja indisponível",
      }),
    ).not.toBeInTheDocument();
  });
});
