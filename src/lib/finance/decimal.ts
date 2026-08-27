import Decimal from "decimal.js";

// Configure Decimal for financial precision
Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

export { Decimal };

/**
 * Creates a Decimal instance safely from string, number, or Decimal
 */
export function toDecimal(val: string | number | Decimal | null | undefined): Decimal {
  if (val === null || val === undefined || val === "") {
    return new Decimal(0);
  }
  try {
    return new Decimal(val);
  } catch {
    return new Decimal(0);
  }
}

/**
 * Formats a decimal/string/number value to a standard numeric string with 2 decimal places (e.g. "1234.50")
 */
export function toFixed2(val: string | number | Decimal | null | undefined): string {
  return toDecimal(val).toFixed(2);
}

/**
 * Formats a monetary value for display with currency symbol / code and locale grouping
 */
export function formatCurrency(
  amount: string | number | Decimal | null | undefined,
  currency: string = "CNY",
  options?: {
    showSign?: boolean;
    compact?: boolean;
  }
): string {
  const dec = toDecimal(amount);
  const num = dec.toNumber();
  const isNegative = dec.isNegative();
  const absNum = Math.abs(num);

  const formattedNum = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(absNum);

  const sign = options?.showSign ? (isNegative ? "-" : "+") : (isNegative ? "-" : "");

  switch (currency.toUpperCase()) {
    case "CNY":
      return `${sign}¥${formattedNum}`;
    case "MAD":
      return `${sign}${formattedNum} MAD`;
    case "USD":
      return `${sign}$${formattedNum}`;
    case "EUR":
      return `${sign}€${formattedNum}`;
    default:
      return `${sign}${formattedNum} ${currency}`;
  }
}

/**
 * Checks if a monetary amount is strictly positive (> 0)
 */
export function isPositive(val: string | number | Decimal | null | undefined): boolean {
  return toDecimal(val).greaterThan(0);
}

/**
 * Checks if a monetary amount is non-negative (>= 0)
 */
export function isNonNegative(val: string | number | Decimal | null | undefined): boolean {
  return toDecimal(val).greaterThanOrEqualTo(0);
}
