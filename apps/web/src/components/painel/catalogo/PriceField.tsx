import { Input } from "@/src/components/ui/input";

const brazilianPricePattern =
  /^(?:\d+|\d{1,3}(?:\.\d{3})+)(?:,(\d{1,2}))?$/;
const maxCatalogPriceInCents = 2_147_483_647;

export function parsePriceToCents(value: string): number {
  const normalized = value.trim();
  const match = normalized.match(brazilianPricePattern);
  if (!match) throw new Error("Informe um preço no formato 12,34.");

  const [integerPart, decimalPart = ""] = normalized.split(",");
  const wholeReais = integerPart.replaceAll(".", "");
  const cents =
    Number(wholeReais) * 100 + Number(decimalPart.padEnd(2, "0") || "0");
  if (
    !Number.isSafeInteger(cents) ||
    cents <= 0 ||
    cents > maxCatalogPriceInCents
  ) {
    throw new Error(
      "O preço precisa ser maior que zero e não pode exceder R$ 21.474.836,47.",
    );
  }

  return cents;
}

type PriceFieldProps = {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
};

export function PriceField({ value, onChange, disabled }: PriceFieldProps) {
  return (
    <label className="painel-field" htmlFor="catalog-price">
      <span>Preço (R$)</span>
      <span className="painel-price-input-wrap">
        <span aria-hidden="true">R$</span>
        <Input
          autoComplete="off"
          disabled={disabled}
          id="catalog-price"
          inputMode="decimal"
          onChange={(event) => onChange(event.target.value)}
          placeholder="0,00"
          required
          value={value}
        />
      </span>
      <small>Use vírgula nos centavos. Ex.: 12,50</small>
    </label>
  );
}
