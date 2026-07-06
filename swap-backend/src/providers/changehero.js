const axios = require("axios");
const axiosRetry = require("axios-retry").default;

const API_BASE_URL = process.env.CHANGEHERO_API_BASE_URL || "https://api.changehero.io/v2";
const API_KEY = process.env.CHANGEHERO_API_KEY || "";
const CURRENCY_CACHE_MS = Number(
  process.env.CHANGEHERO_CURRENCY_CACHE_MS || 5 * 60 * 1000
);
const USD_PRICE_CACHE_MS = Number(process.env.USD_PRICE_CACHE_MS || 60 * 1000);
const MARKET_PRICE_TIMEOUT_MS = Number(process.env.MARKET_PRICE_TIMEOUT_MS || 10000);
const USD_STABLE_TICKERS = new Set([
  "BUSD",
  "DAI",
  "FDUSD",
  "PYUSD",
  "TUSD",
  "USDC",
  "USDD",
  "USDE",
  "USDP",
  "USDT",
]);

const client = axios.create({
  baseURL: API_BASE_URL.replace(/\/+$/, ""),
  timeout: Number(process.env.CHANGEHERO_TIMEOUT_MS || 20000),
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
});

axiosRetry(client, {
  retries: 2,
  retryDelay: axiosRetry.exponentialDelay,
  retryCondition(error) {
    return (
      axiosRetry.isNetworkOrIdempotentRequestError(error) ||
      error?.response?.status === 429 ||
      error?.response?.status >= 500
    );
  },
});

let currencyCache = {
  expiresAt: 0,
  currencies: [],
};
const usdPriceCache = new Map();

async function getCurrencies({ force = false } = {}) {
  if (
    !force &&
    currencyCache.expiresAt > Date.now() &&
    currencyCache.currencies.length
  ) {
    return currencyCache.currencies;
  }

  const data = await rpc("getCurrencies", {});
  const entries = normalizeList(data).flatMap(expandCurrencyEntry);

  if (!entries.length) {
    throw createError(502, "ChangeHero returned an invalid currencies response", {
      details: data,
    });
  }

  const currencies = entries.map(toCurrency).filter(Boolean).sort(compareCurrencies);

  currencyCache = {
    expiresAt: Date.now() + CURRENCY_CACHE_MS,
    currencies,
  };

  return currencies;
}

async function getPairMap() {
  const currencies = await getCurrencies();

  return currencies.reduce((map, currency) => {
    if (currency.enabled !== false) map[currencyKey(currency)] = ["*"];
    return map;
  }, {});
}

async function quote({ from, to, amount, fixed = false, reverse = false }) {
  validateAmount(amount);

  const fromCurrency = await resolveCurrency(from);
  const toCurrency = await resolveCurrency(to);
  const params = compact({
    from: providerCode(fromCurrency),
    to: providerCode(toCurrency),
    amount: String(amount),
    flow: fixed ? "fixed-rate" : "standard",
    type: reverse ? "reverse" : undefined,
  });
  const data = await rpc("getExchangeAmount", params);
  const amountValue = extractAmount(data);

  if (!isValidAmount(amountValue)) {
    throw createError(400, "ChangeHero could not create an estimate", {
      details: data,
    });
  }

  return {
    data,
    amount: amountValue,
    request: params,
    fromCurrency,
    toCurrency,
    reverse: Boolean(reverse),
  };
}

async function getRange(payload) {
  const result = await quote({
    ...payload,
    amount: Number(payload.amount) > 0 ? payload.amount : "1",
  });
  const data = result.data || {};

  return {
    min: data.minAmount || data.min || data.min_amount || null,
    max: data.maxAmount || data.max || data.max_amount || null,
    unlimitedMax: !data.maxAmount && !data.max && !data.max_amount,
    quote: result,
  };
}

async function getUsdValues({ fromCoin, toCoin, fromAmount, toAmount }) {
  const [fromUsd, toUsd] = await Promise.all([
    getUsdValue(fromCoin, fromAmount),
    getUsdValue(toCoin, toAmount),
  ]);

  return {
    fromUsd: fromUsd || toUsd || 0,
    toUsd: toUsd || fromUsd || 0,
  };
}

async function createTransaction(payload) {
  const amount = payload.amount || payload.depositAmount || payload.withdrawalAmount;
  validateAmount(amount);

  const fromCurrency = await resolveCurrency({
    ticker: payload.tickerFrom || payload.coinFrom,
    network: payload.networkFrom || payload.coinFromNetwork,
  });
  const toCurrency = await resolveCurrency({
    ticker: payload.tickerTo || payload.coinTo,
    network: payload.networkTo || payload.coinToNetwork,
  });
  const address = cleanAddress(payload.addressTo || payload.withdrawal);

  if (!address) {
    throw createError(400, "addressTo is required");
  }

  const requestBody = compact({
    from: providerCode(fromCurrency),
    to: providerCode(toCurrency),
    amount: String(amount),
    address,
    extraId: cleanAddress(payload.extraIdTo || payload.withdrawalExtraId),
    refundAddress: cleanAddress(payload.userRefundAddress || payload.return),
    refundExtraId: cleanAddress(payload.userRefundExtraId || payload.returnExtraId),
    flow: payload.fixed ? "fixed-rate" : "standard",
    type: payload.reverse ? "reverse" : "direct",
  });
  const data = await rpc("createTransaction", requestBody);

  return normalizeTransaction(data, {
    fromCurrency,
    toCurrency,
    fixed: Boolean(payload.fixed),
    reverse: Boolean(payload.reverse),
  });
}

async function getTransaction(id) {
  const transactionId = cleanAddress(id);
  if (!transactionId) throw createError(400, "Transaction id is required");

  const data = await rpc("getTransaction", { id: transactionId });
  return normalizeTransaction(data);
}

async function getTransactionStatus(id) {
  return (await getTransaction(id)).changehero.status;
}

function normalizeTransaction(transaction, fallback = {}) {
  const tx = transaction?.transaction || transaction?.data || transaction || {};
  const id = cleanAddress(
    tx.id || tx.transactionId || tx.transaction_id || tx.orderId || tx.order_id
  );

  if (!id) {
    throw createError(502, "ChangeHero returned an invalid transaction response", {
      details: transaction,
    });
  }

  const rawStatus = cleanAddress(tx.status || tx.state || "waiting");
  const fromCode =
    tx.from ||
    tx.currencyFrom ||
    tx.fromCurrency ||
    tx.coinFrom ||
    providerCode(fallback.fromCurrency);
  const toCode =
    tx.to || tx.currencyTo || tx.toCurrency || tx.coinTo || providerCode(fallback.toCurrency);
  const amountFrom =
    tx.amountExpectedFrom ||
    tx.amountFrom ||
    tx.payinAmount ||
    tx.depositAmount ||
    tx.amount ||
    "";
  const amountTo =
    tx.amountExpectedTo ||
    tx.amountTo ||
    tx.payoutAmount ||
    tx.withdrawalAmount ||
    "";
  const depositAddress =
    tx.payinAddress ||
    tx.depositAddress ||
    tx.addressFrom ||
    tx.payin ||
    "";
  const payoutAddress =
    tx.payoutAddress ||
    tx.withdrawal ||
    tx.addressTo ||
    tx.recipientAddress ||
    "";
  const mappedStatus = mapStatus(rawStatus);

  return {
    id,
    provider: "changehero",
    status: mappedStatus,
    amountFrom: String(amountFrom),
    amountTo: String(amountTo),
    tickerFrom: cleanTicker(fallback.fromCurrency?.ticker || fromCode),
    networkFrom: normalizeNetwork(fallback.fromCurrency?.network || fromCode),
    tickerTo: cleanTicker(fallback.toCurrency?.ticker || toCode),
    networkTo: normalizeNetwork(fallback.toCurrency?.network || toCode),
    addressFrom: depositAddress,
    addressTo: payoutAddress,
    depositExtraId: tx.payinExtraId || tx.depositExtraId || tx.extraIdFrom || null,
    depositExtraName: fallback.fromCurrency?.extraName || null,
    refundAddress: tx.refundAddress || "",
    refundExtraId: tx.refundExtraId || null,
    createdAt: tx.createdAt || tx.created_at || new Date().toISOString(),
    completedAt:
      mappedStatus === "finished" ? tx.updatedAt || tx.completedAt || new Date().toISOString() : "",
    changehero: {
      transactionId: id,
      status: rawStatus,
      depositAddress,
      depositExtraId: tx.payinExtraId || tx.depositExtraId || tx.extraIdFrom || null,
      depositHash: tx.payinHash || tx.depositHash || tx.hashIn || null,
      receiveHash: tx.payoutHash || tx.withdrawalHash || tx.hashOut || null,
      rate: tx.rate || null,
      fixed: fallback.fixed,
      reverse: fallback.reverse,
      raw: tx,
    },
  };
}

function toCurrency(entry) {
  const ticker = cleanTicker(entry?.ticker || entry?.symbol || entry?.id || entry?.name);
  if (!ticker) return null;

  const network = normalizeNetwork(
    entry?.network || entry?.blockchain || entry?.chain || entry?.protocol || ticker
  );
  const enabled =
    entry?.enabled !== false &&
    entry?.active !== false &&
    entry?.status !== "disabled" &&
    entry?.isEnabled !== false;

  return {
    ticker,
    network,
    name: entry?.name || ticker.toUpperCase(),
    image: normalizeIconUrl(entry?.image || entry?.icon || entry?.logo || fallbackIconUrl(ticker)),
    enabled,
    isFiat: Boolean(entry?.isFiat),
    isAvailableFixed: enabled,
    isAvailableFloat: enabled,
    hasExtra: Boolean(entry?.extraIdName || entry?.hasExtraId || entry?.hasMemo),
    extraName: entry?.extraIdName || entry?.extraName || null,
    changehero: {
      id: entry?.id || ticker,
      ticker,
      network,
      code: entry?.ticker || entry?.symbol || entry?.id || ticker,
      extraIdName: entry?.extraIdName || entry?.extraName || null,
      raw: entry,
    },
  };
}

async function resolveCurrency(currencyLike) {
  const requestedTicker = cleanTicker(
    currencyLike?.changehero?.ticker ||
      currencyLike?.ticker ||
      currencyLike?.code ||
      currencyLike?.symbol
  );
  const requestedNetwork = cleanTicker(
    currencyLike?.changehero?.network || currencyLike?.network || requestedTicker
  );

  if (!requestedTicker) {
    throw createError(400, "Currency is required");
  }

  const currencies = await getCurrencies();
  const currency =
    currencies.find((candidate) => {
      return (
        cleanTicker(candidate.ticker) === requestedTicker &&
        (!requestedNetwork || cleanTicker(candidate.network) === requestedNetwork)
      );
    }) ||
    currencies.find((candidate) => cleanTicker(candidate.ticker) === requestedTicker);

  if (!currency) {
    throw createError(400, `Unsupported ChangeHero asset: ${requestedTicker.toUpperCase()}`);
  }

  if (currency.enabled === false) {
    throw createError(
      400,
      `${requestedTicker.toUpperCase()} is currently unavailable on ChangeHero`
    );
  }

  return currency;
}

async function getUsdValue(coin, amount) {
  const numericAmount = Number(amount);
  if (!Number.isFinite(numericAmount) || numericAmount <= 0) return 0;

  const ticker = marketTicker(coin);
  if (!ticker) return 0;
  if (USD_STABLE_TICKERS.has(ticker)) return numericAmount;

  const price = await getUsdPrice(ticker);
  return price > 0 ? numericAmount * price : 0;
}

async function getUsdPrice(ticker) {
  const cached = usdPriceCache.get(ticker);
  if (cached?.expiresAt > Date.now()) return cached.price;

  try {
    const response = await axios.get(
      `https://api.coinbase.com/v2/prices/${encodeURIComponent(ticker)}-USD/spot`,
      {
        timeout: MARKET_PRICE_TIMEOUT_MS,
      }
    );
    const price = Number(response.data?.data?.amount);
    const validPrice = Number.isFinite(price) && price > 0 ? price : 0;
    usdPriceCache.set(ticker, {
      price: validPrice,
      expiresAt: Date.now() + USD_PRICE_CACHE_MS,
    });
    return validPrice;
  } catch {
    return 0;
  }
}

async function rpc(method, params = {}) {
  if (!API_KEY) {
    throw createError(500, "CHANGEHERO_API_KEY is required");
  }

  try {
    const response = await client.post(`/${encodeURIComponent(API_KEY)}`, {
      jsonrpc: "2.0",
      id: `${Date.now()}`,
      method,
      params,
    });
    const body = response.data || {};

    if (body.error) {
      const message =
        body.error.message ||
        body.error.details ||
        body.error.data ||
        "ChangeHero request failed";
      throw createError(providerCodeToHttpStatus(body.error.code), message, {
        code: body.error.code,
        details: body.error,
      });
    }

    return body.result;
  } catch (error) {
    if (error.status) throw error;

    const body = error?.response?.data;
    const status = error?.response?.status || 502;
    const providerError = body?.error || body;
    const message =
      providerError?.message ||
      providerError?.details ||
      providerError?.data ||
      error.message ||
      "ChangeHero request failed";

    throw createError(status >= 400 && status < 500 ? status : 502, message, {
      code: providerError?.code,
      details: providerError,
      retryable: status === 429 || status >= 500,
    });
  }
}

function normalizeList(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.currencies)) return data.currencies;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

function expandCurrencyEntry(entry) {
  const networks = Array.isArray(entry?.networks) ? entry.networks : [];

  if (!networks.length) return [entry];

  return networks.map((network) => ({
    ...entry,
    ...network,
    ticker: entry.ticker || entry.symbol || entry.id,
    symbol: entry.symbol || entry.ticker || entry.id,
    name: entry.name || network.name,
    image: network.image || network.icon || entry.image || entry.icon,
    network: network.network || network.id || network.name,
    networkData: network,
  }));
}

function extractAmount(data) {
  if (typeof data === "string" || typeof data === "number") return String(data);
  return String(
    data?.amount ||
      data?.estimatedAmount ||
      data?.amountTo ||
      data?.result ||
      data?.toAmount ||
      ""
  );
}

function providerCode(currency) {
  return String(
    currency?.changehero?.code ||
      currency?.changehero?.id ||
      currency?.ticker ||
      currency?.symbol ||
      ""
  ).toLowerCase();
}

function compareCurrencies(a, b) {
  const tickerSort = cleanTicker(a?.ticker).localeCompare(cleanTicker(b?.ticker));
  if (tickerSort !== 0) return tickerSort;
  return cleanTicker(a?.network).localeCompare(cleanTicker(b?.network));
}

function mapStatus(status) {
  switch (String(status || "").toLowerCase()) {
    case "finished":
    case "complete":
    case "completed":
    case "success":
      return "finished";
    case "confirming":
    case "confirmed":
      return "confirming";
    case "exchanging":
    case "sending":
    case "processing":
      return "sending";
    case "refunded":
      return "refunded";
    case "failed":
    case "expired":
    case "overdue":
      return "failed";
    case "waiting":
    case "new":
    case "hold":
      return "waiting";
    default:
      return status ? String(status).toLowerCase() : "created";
  }
}

function validateAmount(value) {
  if (!isValidAmount(value) || Number(value) <= 0) {
    throw createError(400, "Amount should be a valid positive number");
  }
}

function isValidAmount(value) {
  return /^\d+(\.\d+)?$/.test(String(value ?? "").trim());
}

function cleanTicker(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizeNetwork(value) {
  return cleanTicker(value);
}

function currencyKey(currency) {
  return `${cleanTicker(currency.ticker)}:${normalizeNetwork(currency.network)}`;
}

function cleanAddress(value) {
  return String(value || "").trim();
}

function compact(value = {}) {
  return Object.fromEntries(
    Object.entries(value).filter(([, item]) => item !== undefined && item !== null && item !== "")
  );
}

function marketTicker(coin) {
  return String(coin?.ticker || coin?.symbol || coin?.code || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

function fallbackIconUrl(code) {
  return `https://cdn.jsdelivr.net/npm/cryptocurrency-icons@0.18.1/svg/color/${String(
    code || ""
  ).toLowerCase()}.svg`;
}

function normalizeIconUrl(value) {
  return String(value || "").trim().replace(/^http:\/\//i, "https://");
}

function providerCodeToHttpStatus(code) {
  const numericCode = Number(code);
  if (numericCode >= 400 && numericCode < 500) return numericCode;
  return 502;
}

function createError(status, message, extras = {}) {
  const error = new Error(message);
  error.status = status;
  Object.assign(error, extras);
  return error;
}

module.exports = {
  createTransaction,
  getCurrencies,
  getPairMap,
  getRange,
  getTransaction,
  getTransactionStatus,
  getUsdValues,
  mapStatus,
  quote,
};
