import { parsePriceToCents } from "../PriceField";

describe("parsePriceToCents", () => {
  it.each([
    ["12,34", 1234],
    ["0,01", 1],
    ["1.234,56", 123456],
    ["21.474.836,47", 2147483647],
    ["12", 1200],
    ["12,3", 1230],
  ])("converts Brazilian price %s to exact integer cents", (value, cents) => {
    expect(parsePriceToCents(value)).toBe(cents);
  });

  it.each(["", "   ", "0", "0,00", "-1,00", "12.34", "1,234", "R$ 4,00", "Infinity", "1.23.456,78", "21.474.836,48"])(
    "rejects invalid or non-positive price %s",
    (value) => {
      expect(() => parsePriceToCents(value)).toThrow();
    },
  );
});
