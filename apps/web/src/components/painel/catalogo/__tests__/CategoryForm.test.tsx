import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ApiPaths } from "@comandinha/api-client";
import { CategoryForm } from "../CategoryForm";

type Category = ApiPaths["/catalog/categories"]["get"]["responses"][200]["content"]["application/json"][number];

const existingCategory: Category = {
  id: "category-1",
  restaurantId: "restaurant-1",
  name: "Bebidas",
  nameNormalized: "bebidas",
  description: "Bebidas naturais",
  imageUrl: "https://example.com/bebidas.jpg",
  displayOrder: 0,
  productCount: 0,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

describe("CategoryForm", () => {
  it("sends explicit clear values when optional category details are erased", async () => {
    const user = userEvent.setup();
    const onUpdate = jest.fn().mockResolvedValue(undefined);
    render(
      <CategoryForm
        initialCategory={existingCategory}
        onSave={jest.fn()}
        onUpdate={onUpdate}
        onCancel={jest.fn()}
      />,
    );

    await user.clear(screen.getByLabelText(/Descrição \(opcional\)/));
    await user.clear(screen.getByLabelText(/Imagem \(URL HTTPS, opcional\)/));
    await user.click(screen.getByRole("button", { name: "Salvar categoria" }));

    await waitFor(() =>
      expect(onUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ description: null, imageUrl: null }),
      ),
    );
  });

  it("disables submit while saving and guards duplicate submissions", async () => {
    const user = userEvent.setup();
    let finishSave: (() => void) | undefined;
    const onSave = jest.fn(
      () => new Promise<void>((resolve) => { finishSave = resolve; }),
    );
    render(<CategoryForm onSave={onSave} onUpdate={jest.fn()} onCancel={jest.fn()} />);

    await user.type(screen.getByLabelText("Nome da categoria"), "Bebidas");
    const form = screen.getByRole("button", { name: "Salvar categoria" }).closest("form");
    if (!form) throw new Error("Category form is missing.");

    fireEvent.submit(form);
    fireEvent.submit(form);

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "Salvando…" })).toBeDisabled();
    await act(async () => finishSave?.());
  });
});
