import { Currency } from "../types";

type PairMap = Record<string, string[]>; // "fromKey" -> ["toKey1", "toKey2", ...]

const clean = (value?: string | null) => {
  return String(value || "").trim().toLowerCase();
};

// Generate a key for a currency: "ticker:network"
export function currencyKey(currency?: Currency | null) {
  if (!currency) return "";
  return `${clean(currency.ticker)}:${clean(currency.network)}`;
}

// Compare two currencies
export function isSameCurrency(a?: Currency | null, b?: Currency | null) {
  return Boolean(a && b && currencyKey(a) === currencyKey(b));
}

// ---------------- Pair Map Logic ----------------

// Check if a currency pair is compatible in a PairMap
export function isCompatiblePair({
  from,
  to,
  pairMap,
}: {
  from: Currency | null;
  to: Currency | null;
  pairMap: PairMap;
}) {
  if (!from || !to) return false;
  if (isSameCurrency(from, to)) return false;

  const fromKey = currencyKey(from);
  const toKey = currencyKey(to);
  const toList = pairMap[fromKey] || [];

  return toList.includes("*") || toList.includes(toKey);
}

// Get all currencies that can be swapped **to** the given "to" currency
export function getCompatibleFromCurrencies({
  currencies,
  to,
  pairMap,
}: {
  currencies: Currency[];
  to: Currency | null;
  pairMap: PairMap;
}) {
  if (!to) return currencies.filter((c) => c.enabled !== false);

  const toKey = currencyKey(to);

  return currencies.filter((currency) => {
    if (currency.enabled === false) return false;
    if (isSameCurrency(currency, to)) return false;

    const fromKey = currencyKey(currency);
    const toList = pairMap[fromKey] || [];
    return toList.includes("*") || toList.includes(toKey);
  });
}

// Get all currencies that can be swapped **from** the given "from" currency
export function getCompatibleToCurrencies({
  currencies,
  from,
  pairMap,
}: {
  currencies: Currency[];
  from: Currency | null;
  pairMap: PairMap;
}) {
  if (!from) return currencies.filter((c) => c.enabled !== false);

  const fromKey = currencyKey(from);
  const allowedToKeys = new Set(pairMap[fromKey] || []);
  const allowsAny = allowedToKeys.has("*");

  return currencies.filter((currency) => {
    if (currency.enabled === false) return false;
    if (isSameCurrency(currency, from)) return false;

    const key = currencyKey(currency);
    return allowsAny || allowedToKeys.has(key);
  });
}

// ---------------- Amount Helpers ----------------

// Normalize input amount (max 8 significant digits)
export function normalizeAmount(value?: string) {
  if (!value) return "";

  const number = Number(value);

  if (!Number.isNaN(number) && Number.isFinite(number)) {
    return parseFloat(number.toPrecision(8)).toString();
  }

  return value;
}

// Check if amount is positive
export function isPositiveAmount(value?: string) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0;
}

// Validate sending amount against optional min/max
export function validateSendRange({
  sendAmount,
  min,
  max,
}: {
  sendAmount: string;
  min?: string | number;
  max?: string | number;
}) {
  const amount = Number(sendAmount);
  const minimum = toOptionalPositiveNumber(min);
  const maximum = toOptionalPositiveNumber(max);

  if (!Number.isFinite(amount) || amount <= 0) {
    return {
      valid: false,
      reason: "Enter a valid amount.",
    };
  }

  if (minimum !== null && amount < minimum) {
    return {
      valid: false,
      reason: `Minimum amount is ${minimum}`,
    };
  }

  if (maximum !== null && amount > maximum) {
    return {
      valid: false,
      reason: `Maximum amount is ${maximum}`,
    };
  }

  return {
    valid: true,
    reason: "",
  };
}

export function getDepositRangeLimits(primary?: any, fallback?: any) {
  const min = firstDefined(primary?.min, fallback?.min);
  const max = firstDefined(primary?.max, fallback?.max);
  const unlimitedMax = Boolean(primary?.unlimitedMax || fallback?.unlimitedMax);

  if (!min && !max && !unlimitedMax) return null;

  return {
    min: min ?? null,
    max: max ?? null,
    unlimitedMax,
  };
}

function firstDefined(...values: any[]) {
  return values.find((value) => value !== undefined && value !== null && value !== "");
}

function toOptionalPositiveNumber(value?: string | number) {
  if (value === undefined || value === null || value === "") return null;

  const numericValue = Number(value);

  if (!Number.isFinite(numericValue) || numericValue <= 0) return null;

  return numericValue;
}
