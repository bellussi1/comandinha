import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ApiPaths } from "@comandinha/api-client";
import { ProductForm } from "../ProductForm";

type Category = ApiPaths["/catalog/categories"]["get"]["responses"][200]["content"]["application/json"][number];
type Product = ApiPaths["/catalog/products"]["get"]["responses"][200]["content"]["application/json"][number];

const categories: Category[] = [
  {
    id: "category-1",
    restaurantId: "restaurant-1",
    name: "Bebidas",
    nameNormalized: "bebidas",
    description: null,
    imageUrl: null,
    displayOrder: 0,
    productCount: 0,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
];

const existingProduct: Product = {
  id: "product-1",
  restaurantId: "restaurant-1",
  categoryId: "category-1",
  name: "Suco de laranja",
  description: "Natural",
  priceInCents: 1234,
  imageUrl: "https://example.com/suco.jpg",
  available: true,
  featured: false,
  dietaryTags: ["vegano", "sem lactose"],
  prepTimeMinutes: 5,
  isActive: true,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

describe("ProductForm", () => {
  it("rejects non-HTTPS image URLs before calling the catalog service", async () => {
    const user = userEvent.setup();
    const onSave = jest.fn().mockResolvedValue(undefined);
    render(
      <ProductForm categories={categories} onSave={onSave} onUpdate={jest.fn()} onCancel={jest.fn()} />,
    );

    await user.type(screen.getByLabelText("Nome do produto"), "Suco de laranja");
    await user.selectOptions(screen.getByLabelText("Categoria"), "category-1");
    await user.type(screen.getByLabelText(/Preço \(R\$\)/), "12,34");
    await user.type(
      screen.getByLabelText(/Imagem \(URL HTTPS, opcional\)/),
      "http://example.com/suco.jpg",
    );
    await user.click(screen.getByRole("button", { name: "Salvar produto" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "A imagem precisa usar uma URL HTTPS válida.",
    );
    expect(onSave).not.toHaveBeenCalled();
  });

  it("sends explicit clear values when optional product details are erased", async () => {
    const user = userEvent.setup();
    const onUpdate = jest.fn().mockResolvedValue(undefined);
    render(
      <ProductForm
        categories={categories}
        initialProduct={existingProduct}
        onSave={jest.fn()}
        onUpdate={onUpdate}
        onCancel={jest.fn()}
      />,
    );

    await user.clear(screen.getByLabelText(/Descrição \(opcional\)/));
    await user.clear(screen.getByLabelText(/Imagem \(URL HTTPS, opcional\)/));
    await user.clear(screen.getByLabelText(/Etiquetas \(opcional\)/));
    await user.clear(screen.getByLabelText("Preparo (minutos)"));
    await user.click(screen.getByRole("button", { name: "Salvar produto" }));

    await waitFor(() =>
      expect(onUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          description: null,
          imageUrl: null,
          dietaryTags: [],
          prepTimeMinutes: null,
        }),
      ),
    );
  });

  it("disables submit while saving and guards duplicate submissions", async () => {
    const user = userEvent.setup();
    let finishSave: (() => void) | undefined;
    const onSave = jest.fn(
      () => new Promise<void>((resolve) => { finishSave = resolve; }),
    );
    render(
      <ProductForm categories={categories} onSave={onSave} onUpdate={jest.fn()} onCancel={jest.fn()} />,
    );

    await user.type(screen.getByLabelText("Nome do produto"), "Suco");
    await user.selectOptions(screen.getByLabelText("Categoria"), "category-1");
    await user.type(screen.getByLabelText(/Preço \(R\$\)/), "12,34");
    const form = screen.getByRole("button", { name: "Salvar produto" }).closest("form");
    if (!form) throw new Error("Product form is missing.");

    fireEvent.submit(form);
    fireEvent.submit(form);

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "Salvando…" })).toBeDisabled();
    await act(async () => finishSave?.());
  });
});
