const axios = require("axios");
const axiosRetry = require("axios-retry").default;

const API_BASE_URL =
  process.env.BALTEX_API_BASE_URL || "https://api.baltex.io/v1/cross-chain";
const API_KEY = process.env.BALTEX_API_KEY || "";
const CURRENCY_CACHE_MS = Number(
  process.env.BALTEX_CURRENCY_CACHE_MS || 5 * 60 * 1000
);

const client = axios.create({
  baseURL: API_BASE_URL.replace(/\/+$/, ""),
  timeout: Number(process.env.BALTEX_TIMEOUT_MS || 20000),
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

async function getCurrencies({ force = false } = {}) {
  if (
    !force &&
    currencyCache.expiresAt > Date.now() &&
    currencyCache.currencies.length
  ) {
    return currencyCache.currencies;
  }

  const data = await request("get", "/available-currencies");

  if (!Array.isArray(data)) {
    throw createError(502, "Baltex returned an invalid currencies response", {
      details: data,
    });
  }

  const currencies = data
    .map(toCurrency)
    .filter(Boolean)
    .sort(compareCurrencies);

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

async function quote({ from, to, amount, fixed = false }) {
  validateAmount(amount);

  const fromCurrency = await resolveCurrency(from);
  const toCurrency = await resolveCurrency(to);
  const requestParams = buildRateParams({
    fromCurrency,
    toCurrency,
    amount,
    fixed,
  });
  const data = await request("get", "/rate", undefined, requestParams);

  if (!isValidAmount(data?.toAmount)) {
    throw createError(400, "No Baltex exchange route is available for this pair.", {
      details: data,
    });
  }

  return {
    data,
    request: requestParams,
    fromCurrency,
    toCurrency,
  };
}

async function getRange(payload) {
  const result = await quote({
    ...payload,
    amount: Number(payload.amount) > 0 ? payload.amount : "1",
  });

  return {
    min: stringifyAmount(result.data?.min || null),
    max: result.data?.max === null ? null : stringifyAmount(result.data?.max),
    unlimitedMax: result.data?.max === null,
    quote: result,
  };
}

async function createExchange(payload) {
  const amount = payload.amount || payload.depositAmount;
  validateAmount(amount);

  const recipientAddress = cleanAddress(payload.addressTo);
  if (!recipientAddress) {
    throw createError(400, "addressTo is required");
  }

  const fromCurrency = await resolveCurrency({
    ticker: payload.tickerFrom,
    network: payload.networkFrom,
  });
  const toCurrency = await resolveCurrency({
    ticker: payload.tickerTo,
    network: payload.networkTo,
  });
  const flow = payload.fixed ? "fixed-rate" : "standard";
  const requestBody = compact({
    fromCurrency: fromCurrency.ticker,
    toCurrency: toCurrency.ticker,
    fromNetwork: fromCurrency.network,
    toNetwork: toCurrency.network,
    fromAmount: String(amount),
    address: recipientAddress,
    memo: cleanAddress(payload.extraIdTo || payload.withdrawalExtraId),
    refundAddress: cleanAddress(payload.userRefundAddress || payload.return),
    refundMemo: cleanAddress(payload.userRefundExtraId || payload.returnExtraId),
    flow,
    rateId: flow === "fixed-rate" ? cleanAddress(payload.rateId) : undefined,
  });
  const data = await request("post", "/exchange", requestBody);

  return normalizeExchange(data, {
    payload,
    fromCurrency,
    toCurrency,
    requestBody,
  });
}

async function refreshExchangeStatus(exchange) {
  if (!exchange || exchange.provider !== "baltex") return exchange;

  try {
    const data = await getExchangeStatus(exchange.id);
    return normalizeExchange(data, { existing: exchange });
  } catch (error) {
    return {
      ...exchange,
      baltex: {
        ...(exchange.baltex || {}),
        statusCheckedAt: new Date().toISOString(),
        statusError: error.message || "Baltex status refresh failed",
      },
    };
  }
}

async function getExchangeStatus(id) {
  const exchangeId = cleanAddress(id);
  if (!exchangeId) throw createError(400, "Exchange id is required");

  const data = await request("get", "/exchange/status", undefined, {
    id: exchangeId,
  });

  return data?.exchange || data;
}

function toEstimate(quoteData) {
  const data = quoteData.data || {};
  const fromAmount = data.fromAmount || quoteData.request?.amount;
  const fromUsd = multiplyUsdValue(data.amountFromUsd, fromAmount);
  const toUsd = multiplyUsdValue(data.amountToUsd, data.toAmount);

  return {
    provider: "baltex",
    estimatedAmount: stringifyAmount(data.toAmount),
    amountFrom: stringifyAmount(fromAmount),
    amountTo: stringifyAmount(data.toAmount),
    fromUsd,
    toUsd: toUsd || fromUsd,
    min: data.min ?? null,
    max: data.max ?? null,
    unlimitedMax: data.max === null,
    rateId: data.rateId || null,
    rateExpiresAt: null,
    rate: null,
    fee: null,
    withdrawalFee: null,
    unavailable: false,
    baltex: {
      quote: data,
      request: quoteData.request,
    },
  };
}

function normalizeExchange(data, { payload = {}, fromCurrency, toCurrency, requestBody, existing } = {}) {
  const exchange = data?.exchange || data || {};
  const requestData = exchange.request || {};
  const detail = Array.isArray(exchange.exchanges)
    ? exchange.exchanges[exchange.exchanges.length - 1] || {}
    : {};
  const rawStatus = cleanAddress(exchange.status || detail.status || "pending");
  const status = mapStatus(rawStatus);
  const createdAt = exchange.created
    ? new Date(exchange.created).toISOString()
    : existing?.createdAt || new Date().toISOString();
  const completedAt =
    status === "finished"
      ? existing?.completedAt || new Date().toISOString()
      : existing?.completedAt || "";
  const normalizedFrom =
    fromCurrency ||
    existing?.baltex?.fromCurrency ||
    toCurrencyRecord(requestData.fromCurrency, requestData.fromNetwork);
  const normalizedTo =
    toCurrency ||
    existing?.baltex?.toCurrency ||
    toCurrencyRecord(requestData.toCurrency, requestData.toNetwork);
  const depositExtra = cleanAddress(requestData.depositMemo);

  return {
    ...(existing || {}),
    id: cleanAddress(exchange.id || existing?.id),
    provider: "baltex",
    status,
    amountFrom: stringifyAmount(
      requestData.amountFromRequested || payload.amount || existing?.amountFrom
    ),
    amountTo: stringifyAmount(
      requestData.amountToRequested ||
        detail.amountToReceived ||
        existing?.amountTo
    ),
    tickerFrom: cleanTicker(normalizedFrom?.ticker || requestData.fromCurrency),
    networkFrom: cleanTicker(normalizedFrom?.network || requestData.fromNetwork),
    tickerTo: cleanTicker(normalizedTo?.ticker || requestData.toCurrency),
    networkTo: cleanTicker(normalizedTo?.network || requestData.toNetwork),
    addressFrom: cleanAddress(requestData.depositAddress || existing?.addressFrom),
    addressTo: cleanAddress(
      requestData.recipientAddress || payload.addressTo || existing?.addressTo
    ),
    depositExtraId: depositExtra || existing?.depositExtraId || null,
    depositExtraName: depositExtra ? "Deposit memo" : existing?.depositExtraName || null,
    refundAddress: cleanAddress(
      requestData.refundAddress ||
        payload.userRefundAddress ||
        existing?.refundAddress
    ),
    refundExtraId:
      cleanAddress(requestData.refundMemo || payload.userRefundExtraId) ||
      existing?.refundExtraId ||
      null,
    createdAt,
    completedAt,
    baltex: {
      ...(existing?.baltex || {}),
      exchangeId: cleanAddress(exchange.id || existing?.id),
      status: rawStatus,
      exchangeType: exchange.exchangeType || data?.type || "standard",
      fromCurrency: normalizedFrom,
      toCurrency: normalizedTo,
      depositAddress: cleanAddress(requestData.depositAddress || existing?.addressFrom),
      depositExtraId: depositExtra || existing?.depositExtraId || null,
      depositHash:
        cleanAddress(detail.payinHash) ||
        cleanAddress(existing?.baltex?.depositHash) ||
        null,
      receiveHash:
        cleanAddress(detail.payoutHash) ||
        cleanAddress(existing?.baltex?.receiveHash) ||
        null,
      amountToSend: stringifyAmount(
        requestData.amountFromRequested || payload.amount || existing?.amountFrom
      ),
      request: requestBody || existing?.baltex?.request || null,
      remoteRequest: requestData,
      exchanges: exchange.exchanges || existing?.baltex?.exchanges || [],
      raw: exchange,
      statusCheckedAt: new Date().toISOString(),
      statusError: "",
    },
  };
}

async function resolveCurrency(currencyLike) {
  const requestedTicker = cleanTicker(
    currencyLike?.baltex?.ticker ||
      currencyLike?.ticker ||
      currencyLike?.code ||
      currencyLike?.symbol
  );
  const requestedNetwork = cleanTicker(
    currencyLike?.baltex?.network || currencyLike?.network
  );

  if (!requestedTicker || !requestedNetwork) {
    throw createError(400, "Baltex currency and network are required");
  }

  const currency = (await getCurrencies()).find((candidate) => {
    return (
      cleanTicker(candidate.ticker) === requestedTicker &&
      cleanTicker(candidate.network) === requestedNetwork
    );
  });

  if (!currency) {
    throw createError(
      400,
      `Unsupported Baltex asset: ${requestedTicker.toUpperCase()} on ${requestedNetwork}`
    );
  }

  if (currency.enabled === false) {
    throw createError(
      400,
      `${requestedTicker.toUpperCase()} on ${requestedNetwork} is currently unavailable on Baltex`
    );
  }

  return currency;
}

function buildRateParams({ fromCurrency, toCurrency, amount, fixed }) {
  return {
    fromCurrency: fromCurrency.ticker,
    fromNetwork: fromCurrency.network,
    toCurrency: toCurrency.ticker,
    toNetwork: toCurrency.network,
    amount: String(amount),
    flow: fixed ? "fixed-rate" : "standard",
  };
}

async function request(method, url, data, params) {
  try {
    const response = await client.request({
      method,
      url,
      data: compact(data),
      params: compact(params),
      headers: API_KEY ? { "x-api-key": API_KEY } : {},
    });

    return response.data;
  } catch (error) {
    const body = error?.response?.data;
    const status = error?.response?.status || 502;
    const message =
      body?.message ||
      body?.error ||
      body?.details ||
      error.message ||
      "Baltex request failed";

    throw createError(status >= 400 && status < 500 ? status : 502, message, {
      code: body?.code,
      details: body,
      retryable: status === 429 || status >= 500,
    });
  }
}

function toCurrency(currency) {
  const ticker = cleanTicker(currency?.ticker);
  const network = cleanTicker(currency?.network);
  if (!ticker || !network) return null;

  const enabled = currency.enabled !== false;

  return {
    ticker,
    network,
    name: currency.name || ticker.toUpperCase(),
    image: normalizeImageUrl(currency.image),
    enabled,
    isFiat: Boolean(currency.isFiat),
    isAvailableFixed: enabled && Boolean(currency.supportsFixedRate),
    isAvailableFloat: enabled,
    hasExtra: Boolean(currency.hasMemo),
    extraName: currency.requireMemo ? "Memo" : currency.hasMemo ? "Memo" : null,
    baltex: {
      id: currency.id,
      ticker,
      network,
      symbol: currency.symbol,
      hasMemo: Boolean(currency.hasMemo),
      requireMemo: Boolean(currency.requireMemo),
      supportsFixedRate: Boolean(currency.supportsFixedRate),
      image: normalizeImageUrl(currency.image),
      regexAddress: currency.regexAddress || "",
      regexMemo: currency.regexMemo || "",
      addressExplorer: currency.addressExplorer || "",
      txExplorer: currency.txExplorer || "",
      confirmations: currency.confirmations ?? null,
      rank: currency.rank ?? null,
      contractAddress: currency.contractAddress || "",
      isNative: Boolean(currency.isNative),
      adapterType: currency.adapterType || "",
      decimals: currency.decimals ?? null,
    },
  };
}

function toCurrencyRecord(ticker, network) {
  return {
    ticker: cleanTicker(ticker),
    network: cleanTicker(network),
  };
}

function mapStatus(status) {
  switch (String(status || "").toLowerCase()) {
    case "finished":
      return "finished";
    case "confirming":
      return "confirming";
    case "exchanging":
    case "sending":
      return "sending";
    case "failed":
      return "failed";
    case "refunded":
      return "refunded";
    case "pending":
      return "waiting";
    default:
      return status ? String(status).toLowerCase() : "created";
  }
}

function compareCurrencies(a, b) {
  const rankA = Number(a?.baltex?.rank || a?.baltex?.id || 999999);
  const rankB = Number(b?.baltex?.rank || b?.baltex?.id || 999999);
  if (rankA !== rankB) return rankA - rankB;

  const tickerCompare = String(a?.ticker || "").localeCompare(
    String(b?.ticker || "")
  );
  if (tickerCompare !== 0) return tickerCompare;

  return String(a?.network || "").localeCompare(String(b?.network || ""));
}

function validateAmount(value) {
  if (!isValidAmount(value) || Number(value) <= 0) {
    throw createError(400, "Amount should be a valid positive number");
  }
}

function isValidAmount(value) {
  return /^\d+(\.\d+)?$/.test(String(value ?? "").trim());
}

function currencyKey(currency) {
  return `${cleanTicker(currency.ticker)}:${cleanTicker(currency.network)}`;
}

function cleanTicker(value) {
  return String(value || "").trim().toLowerCase();
}

function cleanAddress(value) {
  return String(value || "").trim();
}

function normalizeImageUrl(value) {
  return String(value || "")
    .trim()
    .split("+")[0]
    .replace(/^http:\/\//i, "https://");
}

function stringifyAmount(value) {
  if (value === null || value === undefined || value === "") return "0";
  return String(value);
}

function multiplyUsdValue(rawValue, amount) {
  const numericValue = Number(rawValue || 0);
  const numericAmount = Number(amount || 0);

  if (!Number.isFinite(numericValue) || !Number.isFinite(numericAmount)) return 0;
  if (numericValue <= 0 || numericAmount <= 0) return 0;

  return numericValue * numericAmount;
}

function compact(value = {}) {
  return Object.fromEntries(
    Object.entries(value).filter(([, item]) => item !== undefined && item !== null && item !== "")
  );
}

function createError(status, message, extras = {}) {
  const error = new Error(message);
  error.status = status;
  Object.assign(error, extras);
  return error;
}

module.exports = {
  createExchange,
  getCurrencies,
  getExchangeStatus,
  getPairMap,
  getRange,
  quote,
  refreshExchangeStatus,
  toEstimate,
};
