const crypto = require("crypto");
const axios = require("axios");
const axiosRetry = require("axios-retry").default;

const API_BASE_URL = process.env.BALTEX_DEFI_API_BASE_URL || "https://api.baltex.io/v1/defi";
const API_KEY = process.env.BALTEX_DEFI_API_KEY || process.env.BALTEX_API_KEY || "";
const CURRENCY_CACHE_MS = Number(process.env.BALTEX_DEFI_CURRENCY_CACHE_MS || 5 * 60 * 1000);
const DEFAULT_SLIPPAGE = String(process.env.BALTEX_DEFI_SLIPPAGE || "1");
const DEFAULT_REFERRER_FEE = String(process.env.BALTEX_DEFI_REFERRER_FEE || "0");
const NETWORKS = String(
  process.env.BALTEX_DEFI_NETWORKS ||
    "eth,sol,sui,sei,arbitrum,base,bsc,cchain,celo,linea,matic,op,sonic,uni"
)
  .split(",")
  .map((network) => network.trim().toLowerCase())
  .filter(Boolean);

const EVM_CHAIN_IDS = {
  eth: 1,
  arbitrum: 42161,
  base: 8453,
  bsc: 56,
  cchain: 43114,
  avaxc: 43114,
  avalanche: 43114,
  celo: 42220,
  linea: 59144,
  matic: 137,
  polygon: 137,
  op: 10,
  optimism: 10,
  sonic: 146,
  uni: 130,
};

const NETWORK_ALIASES = {
  arb: "arbitrum",
  avax: "cchain",
  avaxc: "cchain",
  avalanche: "cchain",
  ethereum: "eth",
  optimism: "op",
  polygon: "matic",
  solana: "sol",
};

const client = axios.create({
  baseURL: API_BASE_URL.replace(/\/+$/, ""),
  timeout: Number(process.env.BALTEX_DEFI_TIMEOUT_MS || 30000),
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
  if (!force && currencyCache.expiresAt > Date.now() && currencyCache.currencies.length) {
    return currencyCache.currencies;
  }

  const pages = await Promise.all(
    NETWORKS.map(async (network) => {
      try {
        return await request("get", "/available-currencies", undefined, {
          network,
          limit: process.env.BALTEX_DEFI_CURRENCY_LIMIT || "300",
        });
      } catch (error) {
        if (error?.status === 401) throw error;
        return [];
      }
    })
  );
  const currencies = uniqueByCurrencyKey(
    pages
      .flatMap((page) => (Array.isArray(page) ? page : page?.items || page?.data || []))
      .map(toCurrency)
      .filter(Boolean)
      .sort(compareCurrencies)
  );

  currencyCache = {
    expiresAt: Date.now() + CURRENCY_CACHE_MS,
    currencies,
  };

  return currencies;
}

async function getPairMap() {
  const currencies = await getCurrencies();

  return currencies.reduce((map, currency) => {
    if (currency.enabled === false) return map;

    map[currencyKey(currency)] = currencies
      .filter((candidate) => {
        return (
          candidate.enabled !== false &&
          candidate.network === currency.network &&
          currencyKey(candidate) !== currencyKey(currency)
        );
      })
      .map(currencyKey);

    return map;
  }, {});
}

async function quote({ from, to, amount }) {
  validateAmount(amount);

  const fromCurrency = await resolveCurrency(from);
  const toCurrency = await resolveCurrency(to);

  if (fromCurrency.network !== toCurrency.network) {
    throw createError(400, "Baltex DeFi swaps require both assets to be on the same network.");
  }

  const requestParams = buildQuoteParams({ fromCurrency, toCurrency, amount });
  const data = await request("get", "/quote", undefined, requestParams);

  if (!isValidAmount(data?.toAmount || data?.receivedAmount)) {
    throw createError(400, "No Baltex DeFi route is available for this pair.", {
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

async function getRange() {
  return {
    min: null,
    max: null,
    unlimitedMax: true,
  };
}

async function createExchange(payload) {
  const amount = payload.amount || payload.depositAmount;
  validateAmount(amount);

  const receiver = cleanAddress(payload.addressTo);
  if (!receiver) {
    throw createError(400, "addressTo is required");
  }

  const quoteData = await quote({
    from: {
      ticker: payload.tickerFrom,
      network: payload.networkFrom,
    },
    to: {
      ticker: payload.tickerTo,
      network: payload.networkTo,
    },
    amount,
  });

  return normalizeExchangeRecord({
    id: createExchangeId(),
    payload,
    quoteData,
    status: "created",
  });
}

async function prepareExchangeTransaction(exchange, payload = {}) {
  const account = cleanAddress(payload.fromAddress);
  if (!account) {
    throw createError(400, "fromAddress is required to prepare a Baltex DeFi swap");
  }

  const receiver = cleanAddress(payload.receiver || exchange.addressTo);
  if (!receiver) {
    throw createError(400, "receiver is required to prepare a Baltex DeFi swap");
  }

  const fromCurrency = exchange.baltexDefi?.fromCurrency || {
    ticker: exchange.tickerFrom,
    network: exchange.networkFrom,
    baltexDefi: exchange.baltexDefi?.fromToken,
  };
  const toCurrency = exchange.baltexDefi?.toCurrency || {
    ticker: exchange.tickerTo,
    network: exchange.networkTo,
    baltexDefi: exchange.baltexDefi?.toToken,
  };
  const amount = exchange.amountFrom;
  const quoteData = await quote({ from: fromCurrency, to: toCurrency, amount });
  const requestBody = buildSwapBody({
    account,
    fromCurrency: quoteData.fromCurrency,
    toCurrency: quoteData.toCurrency,
    amount,
  });
  const transactionData = await request("post", "/transaction/swap", requestBody);

  return normalizeExchangeRecord({
    id: exchange.id,
    payload: {
      tickerFrom: exchange.tickerFrom,
      networkFrom: exchange.networkFrom,
      tickerTo: exchange.tickerTo,
      networkTo: exchange.networkTo,
      amount,
      addressTo: receiver,
      userRefundAddress: account,
    },
    quoteData,
    transactionData,
    swapRequest: requestBody,
    existing: exchange,
    status: "waiting",
  });
}

async function confirmExchange(exchange, payload = {}) {
  const hash = cleanAddress(payload.txHash || payload.hash || payload.depositHash);
  const rawTx = cleanAddress(payload.rawTx);
  const baltexDefi = exchange?.baltexDefi || {};
  const requestBody = compact({
    account: cleanAddress(payload.account || baltexDefi.account || exchange.refundAddress),
    amountFrom: stringifyAmount(exchange.amountFrom),
    amountTo: stringifyAmount(exchange.amountTo),
    fromTokenAddress: baltexDefi.fromToken?.address,
    toTokenAddress: baltexDefi.toToken?.address,
    network: normalizeNetwork(exchange.networkFrom),
    commissionPercentage: DEFAULT_REFERRER_FEE,
    rawTx,
    hash,
    to: cleanAddress(exchange.addressTo),
    isExchange: true,
  });

  let remoteHash = "";
  if (hash || rawTx) {
    try {
      const result = await request("post", "/send/swap", requestBody);
      remoteHash = cleanAddress(typeof result === "string" ? result : result?.hash || result?.txHash);
    } catch (error) {
      return {
        ...exchange,
        status: hash ? "sending" : exchange.status,
        baltexDefi: {
          ...baltexDefi,
          depositHash: hash || baltexDefi.depositHash || "",
          sendRequest: requestBody,
          sendError: error.message || "Baltex DeFi send confirmation failed",
        },
      };
    }
  }

  return {
    ...exchange,
    status: hash || remoteHash ? "sending" : exchange.status,
    baltexDefi: {
      ...baltexDefi,
      depositHash: hash || remoteHash || baltexDefi.depositHash || "",
      sendRequest: requestBody,
      sendHash: remoteHash || hash || baltexDefi.sendHash || "",
      sendError: "",
    },
  };
}

async function refreshExchangeStatus(exchange) {
  if (!exchange || exchange.provider !== "baltex-defi") return exchange;

  try {
    const data = await request("get", "/exchange/list", undefined, {
      network: normalizeNetwork(exchange.networkFrom),
      fromTokenAddress: exchange.baltexDefi?.fromToken?.address,
      toTokenAddress: exchange.baltexDefi?.toToken?.address,
    });
    const exchanges = Array.isArray(data?.exchanges) ? data.exchanges : [];
    const match = exchanges.find((entry) => {
      return (
        cleanAddress(entry.id) === exchange.baltexDefi?.exchangeId ||
        cleanAddress(entry.hash) === cleanAddress(exchange.baltexDefi?.depositHash)
      );
    });

    if (!match) {
      return {
        ...exchange,
        baltexDefi: {
          ...(exchange.baltexDefi || {}),
          statusCheckedAt: new Date().toISOString(),
        },
      };
    }

    return applyRemoteStatus(exchange, match);
  } catch (error) {
    return {
      ...exchange,
      baltexDefi: {
        ...(exchange.baltexDefi || {}),
        statusCheckedAt: new Date().toISOString(),
        statusError: error.message || "Baltex DeFi status refresh failed",
      },
    };
  }
}

function toEstimate(quoteData) {
  const data = quoteData.data || {};
  const amountTo = data.receivedAmount || data.toAmount;

  return {
    provider: "baltex-defi",
    estimatedAmount: stringifyAmount(amountTo),
    amountFrom: stringifyAmount(data.fromAmount || quoteData.request?.amount),
    amountTo: stringifyAmount(amountTo),
    fromUsd: Number(data.usdFromAmount || 0),
    toUsd: Number(data.usdToAmount || 0),
    min: null,
    max: null,
    unlimitedMax: true,
    rateId: null,
    rateExpiresAt: null,
    rate: null,
    fee: data.fee ?? null,
    withdrawalFee: null,
    priceImpact: data.priceImpact ?? null,
    unavailable: false,
    baltexDefi: {
      quote: data,
      request: quoteData.request,
      routes: data.routes || [],
    },
  };
}

function normalizeExchangeRecord({
  id,
  payload,
  quoteData,
  transactionData,
  swapRequest,
  existing,
  status,
}) {
  const estimate = toEstimate(quoteData);
  const fromCurrency = quoteData.fromCurrency;
  const toCurrency = quoteData.toCurrency;
  const tx = normalizeTransaction(transactionData, fromCurrency.network);
  const now = new Date().toISOString();

  return {
    ...(existing || {}),
    id,
    provider: "baltex-defi",
    status,
    amountFrom: stringifyAmount(payload.amount),
    amountTo: estimate.amountTo,
    tickerFrom: fromCurrency.ticker,
    networkFrom: fromCurrency.network,
    tickerTo: toCurrency.ticker,
    networkTo: toCurrency.network,
    addressFrom: tx.to || "",
    addressTo: cleanAddress(payload.addressTo),
    depositExtraId: null,
    depositExtraName: null,
    refundAddress: cleanAddress(payload.userRefundAddress || existing?.refundAddress),
    refundExtraId: null,
    createdAt: existing?.createdAt || now,
    completedAt: existing?.completedAt || "",
    baltexDefi: {
      ...(existing?.baltexDefi || {}),
      provider: "baltex-defi",
      fromCurrency,
      toCurrency,
      fromToken: fromCurrency.baltexDefi,
      toToken: toCurrency.baltexDefi,
      quote: quoteData.data,
      quoteRequest: quoteData.request,
      routes: quoteData.data?.routes || [],
      tx,
      approval: null,
      executionType: "wallet",
      needsWallet: true,
      depositAddress: "",
      amountToSend: stringifyAmount(payload.amount),
      exchangeId: existing?.baltexDefi?.exchangeId || "",
      account: cleanAddress(payload.userRefundAddress || existing?.refundAddress),
      swapRequest: swapRequest || existing?.baltexDefi?.swapRequest || null,
      rawTransaction: transactionData || existing?.baltexDefi?.rawTransaction || null,
      depositHash: existing?.baltexDefi?.depositHash || "",
      receiveHash: existing?.baltexDefi?.receiveHash || "",
      remoteStatus: existing?.baltexDefi?.remoteStatus || "",
      statusCheckedAt: existing?.baltexDefi?.statusCheckedAt || "",
      statusError: "",
    },
  };
}

function normalizeTransaction(transactionData, network) {
  const raw = Array.isArray(transactionData) ? transactionData[0] : transactionData;
  const chainId = chainIdToHex(EVM_CHAIN_IDS[normalizeNetwork(network)]);

  if (!raw) return {};

  if (typeof raw === "string") {
    return {
      to: "",
      data: raw,
      rawTx: raw,
      value: "0x0",
      chainId,
      chainType: normalizeNetwork(network) === "sol" ? "SOLANA" : "EVM",
    };
  }

  return {
    to: cleanAddress(raw.to || raw.transaction?.to),
    data: cleanAddress(raw.data || raw.transaction?.data || raw.rawTx || raw.tx || raw.serializedTransaction),
    rawTx: cleanAddress(raw.rawTx || raw.tx || raw.serializedTransaction),
    value: stringifyAmount(raw.value || raw.transaction?.value || "0x0"),
    chainId: chainId || chainIdToHex(raw.chainId),
    chainType: normalizeNetwork(network) === "sol" ? "SOLANA" : "EVM",
  };
}

async function resolveCurrency(currencyLike) {
  const direct = currencyLike?.baltexDefi || currencyLike?.defi;
  const requestedAddress = cleanAddress(direct?.address || currencyLike?.address);
  const requestedTicker = cleanTicker(
    direct?.symbol || direct?.ticker || currencyLike?.ticker || currencyLike?.symbol
  );
  const requestedNetwork = normalizeNetwork(direct?.network || currencyLike?.network);

  if (!requestedNetwork) {
    throw createError(400, "Baltex DeFi network is required");
  }

  if (requestedAddress) {
    const info = await request("get", "/currency/info", undefined, {
      network: requestedNetwork,
      address: requestedAddress,
    });
    const currency = toCurrency(info);
    if (currency) return currency;
  }

  const currency = (await getCurrencies()).find((candidate) => {
    return (
      candidate.network === requestedNetwork &&
      (cleanAddress(candidate.baltexDefi?.address).toLowerCase() === requestedAddress.toLowerCase() ||
        cleanTicker(candidate.ticker) === requestedTicker)
    );
  });

  if (!currency) {
    throw createError(
      400,
      `Unsupported Baltex DeFi asset: ${requestedTicker.toUpperCase()} on ${requestedNetwork}`
    );
  }

  if (currency.enabled === false) {
    throw createError(
      400,
      `${requestedTicker.toUpperCase()} on ${requestedNetwork} is currently unavailable on Baltex DeFi`
    );
  }

  return currency;
}

function buildQuoteParams({ fromCurrency, toCurrency, amount }) {
  return {
    network: fromCurrency.network,
    fromTokenAddress: fromCurrency.baltexDefi.address,
    toTokenAddress: toCurrency.baltexDefi.address,
    amount: String(amount),
    slippage: DEFAULT_SLIPPAGE,
    referrerFee: DEFAULT_REFERRER_FEE,
  };
}

function buildSwapBody({ account, fromCurrency, toCurrency, amount }) {
  return {
    account,
    fromTokenAddress: fromCurrency.baltexDefi.address,
    toTokenAddress: toCurrency.baltexDefi.address,
    amount: String(amount),
    slippage: DEFAULT_SLIPPAGE,
    referrerFee: DEFAULT_REFERRER_FEE,
    network: fromCurrency.network,
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
      "Baltex DeFi request failed";

    throw createError(status >= 400 && status < 500 ? status : 502, message, {
      code: body?.code,
      details: body,
      retryable: status === 429 || status >= 500,
    });
  }
}

function toCurrency(currency) {
  const network = normalizeNetwork(currency?.network);
  const address = cleanAddress(currency?.address);
  const symbol = cleanTicker(currency?.symbol);

  if (!network || !address || !symbol) return null;

  return {
    ticker: symbol,
    network,
    name: currency.name || symbol.toUpperCase(),
    image: normalizeImageUrl(currency.image),
    enabled: currency.enabled !== false,
    isFiat: false,
    isAvailableFixed: false,
    isAvailableFloat: currency.enabled !== false,
    provider: "baltex-defi",
    baltexDefi: {
      address,
      decimals: Number(currency.decimals ?? 0),
      symbol,
      network,
      name: currency.name || symbol.toUpperCase(),
      image: normalizeImageUrl(currency.image),
    },
  };
}

function applyRemoteStatus(exchange, remote) {
  const nextStatus = mapStatus(remote.status, exchange.status);
  const completedAt =
    nextStatus === "finished" && !exchange.completedAt
      ? new Date().toISOString()
      : exchange.completedAt;

  return {
    ...exchange,
    status: nextStatus,
    amountFrom: stringifyAmount(remote.amountFrom || exchange.amountFrom),
    amountTo: stringifyAmount(remote.amountTo || exchange.amountTo),
    completedAt,
    baltexDefi: {
      ...(exchange.baltexDefi || {}),
      exchangeId: cleanAddress(remote.id || exchange.baltexDefi?.exchangeId),
      remoteStatus: cleanAddress(remote.status),
      depositHash: cleanAddress(remote.hash || exchange.baltexDefi?.depositHash),
      receiveHash: cleanAddress(remote.hash || exchange.baltexDefi?.receiveHash),
      remoteExchange: remote,
      statusCheckedAt: new Date().toISOString(),
      statusError: "",
    },
  };
}

function mapStatus(status, fallbackStatus = "waiting") {
  switch (String(status || "").toLowerCase()) {
    case "finished":
    case "success":
    case "completed":
      return "finished";
    case "failed":
    case "reverted":
      return "failed";
    case "refunded":
      return "refunded";
    case "confirming":
      return "confirming";
    case "sending":
    case "exchanging":
    case "pending":
      return "sending";
    default:
      return fallbackStatus || "waiting";
  }
}

function compareCurrencies(a, b) {
  const networkCompare = String(a?.network || "").localeCompare(String(b?.network || ""));
  if (networkCompare !== 0) return networkCompare;
  return String(a?.ticker || "").localeCompare(String(b?.ticker || ""));
}

function uniqueByCurrencyKey(currencies) {
  const seen = new Set();
  return currencies.filter((currency) => {
    const key = currencyKey(currency);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
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
  return `${cleanTicker(currency.ticker)}:${normalizeNetwork(currency.network)}`;
}

function createExchangeId() {
  return `baltex_defi_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
}

function normalizeNetwork(value) {
  const key = cleanTicker(value);
  return NETWORK_ALIASES[key] || key;
}

function cleanTicker(value) {
  return String(value || "").trim().toLowerCase();
}

function cleanAddress(value) {
  return String(value || "").trim();
}

function normalizeImageUrl(value) {
  return String(value || "").trim().replace(/^http:\/\//i, "https://");
}

function stringifyAmount(value) {
  if (value === null || value === undefined || value === "") return "0";
  return String(value);
}

function chainIdToHex(value) {
  const chainId = Number(value);
  if (!Number.isFinite(chainId) || chainId <= 0) return "";
  return `0x${chainId.toString(16)}`;
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
  confirmExchange,
  createExchange,
  getCurrencies,
  getPairMap,
  getRange,
  prepareExchangeTransaction,
  quote,
  refreshExchangeStatus,
  toEstimate,
};
