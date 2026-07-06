const axios = require("axios");
const axiosRetry = require("axios-retry").default;

const API_BASE_URL =
  process.env.GODEX_API_BASE_URL || "https://api.godex.io/api/v1";
const PUBLIC_KEY = process.env.GODEX_PUBLIC_KEY || "";
const AFFILIATE_ID = process.env.GODEX_AFFILIATE_ID || "";
const COIN_CACHE_MS = Number(process.env.GODEX_COIN_CACHE_MS || 5 * 60 * 1000);
const USD_PRICE_CACHE_MS = Number(process.env.USD_PRICE_CACHE_MS || 60 * 1000);
const MARKET_PRICE_CACHE_MS = Number(process.env.MARKET_PRICE_CACHE_MS || 60 * 1000);
const USD_PRICE_SAMPLE_AMOUNTS = [
  "1",
  "0.1",
  "10",
  "100",
  "0.01",
  "1000",
  "0.001",
  "10000",
];
const USD_STABLE_CODES = new Set([
  "BUSD",
  "DAI",
  "FDUSD",
  "TUSD",
  "USDC",
  "USDP",
  "USDT",
]);
const FALLBACK_COINS = [
  coin("BTC", "Bitcoin"),
  coin("ETH", "Ethereum"),
  coin("USDT", "Tether USD"),
  coin("USDC", "USD Coin"),
  coin("BNB", "BNB"),
  coin("TRX", "TRON"),
  coin("SOL", "Solana"),
  coin("XRP", "XRP"),
  coin("DOGE", "Dogecoin"),
  coin("ADA", "Cardano"),
  coin("AVAX", "Avalanche"),
  coin("DOT", "Polkadot"),
  coin("MATIC", "Polygon"),
  coin("LTC", "Litecoin"),
  coin("BCH", "Bitcoin Cash"),
  coin("XLM", "Stellar"),
  coin("ATOM", "Cosmos"),
  coin("LINK", "Chainlink"),
  coin("UNI", "Uniswap"),
  coin("ETC", "Ethereum Classic"),
];

const STATUS_MESSAGES = {
  wait: "The exchange is waiting for the deposit.",
  confirmation: "The deposit is waiting for network confirmations.",
  confirmed: "The deposit is confirmed.",
  exchanging: "The exchange is running.",
  sending: "The payout is being sent.",
  sending_confirmation: "The payout is waiting for network confirmations.",
  success: "The exchange is complete.",
  overdue: "The deposit window has expired.",
  error: "The exchange failed.",
  refunded: "The deposit was refunded.",
};

const client = axios.create({
  baseURL: API_BASE_URL.replace(/\/+$/, ""),
  timeout: Number(process.env.GODEX_TIMEOUT_MS || 20000),
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
});

axiosRetry(client, {
  retries: 2,
  retryDelay: axiosRetry.exponentialDelay,
  retryCondition(error) {
    if (axiosRetry.isNetworkOrIdempotentRequestError(error)) return true;
    const status = error?.response?.status || 0;
    return status === 429 || status >= 500;
  },
});

let coinCache = {
  expiresAt: 0,
  coins: [],
};
const usdPriceCache = new Map();
let marketPriceCache = {
  expiresAt: 0,
  prices: {},
};

async function getCoins({ force = false } = {}) {
  const now = Date.now();

  if (!force && coinCache.expiresAt > now && coinCache.coins.length) {
    return coinCache.coins;
  }

  let coins;

  try {
    coins = await request("get", "/coins");
  } catch (error) {
    if (coinCache.coins.length) {
      return coinCache.coins;
    }

    if (error?.retryable || error?.status === 502 || error?.status === 503) {
      return FALLBACK_COINS;
    }

    throw error;
  }

  if (!Array.isArray(coins)) {
    throw createError(502, "Godex returned an invalid coins response");
  }

  coinCache = {
    expiresAt: now + COIN_CACHE_MS,
    coins,
  };

  return coins;
}

async function getCurrencies() {
  const coins = await getCoins();

  return coins.map(toCurrency).filter(Boolean);
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

  const fromCoin = await resolveCoin(from);
  const toCoin = await resolveCoin(to);
  const endpoint = reverse ? "/info-revert" : "/info";
  const payload = {
    from: fromCoin.code,
    to: toCoin.code,
    amount,
    float: !Boolean(fixed),
    ...networkPayload(from, to),
  };

  const data = await request("post", endpoint, payload);

  return {
    data,
    fromCoin,
    toCoin,
    request: payload,
    reverse: Boolean(reverse),
  };
}

async function getRange({ from, to, amount, fixed = false, reverse = false }) {
  const quoteAmount = amount && Number(amount) > 0 ? amount : "1";
  const quoteData = await quote({
    from,
    to,
    amount: quoteAmount,
    fixed,
    reverse,
  });
  const data = quoteData.data || {};
  const maxAmount = data.max_amount ?? null;
  const unlimitedMax = maxAmount !== null && Number(maxAmount) === 0;

  return {
    min: data.min_amount ?? null,
    max: maxAmount && Number(maxAmount) > 0 ? maxAmount : null,
    unlimitedMax,
    quote: quoteData,
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

async function getMarketEstimate({ from, to, amount }) {
  validateAmount(amount);

  const fromCode = String(from?.ticker || from?.code || from?.symbol || "")
    .trim()
    .toUpperCase();
  const toCode = String(to?.ticker || to?.code || to?.symbol || "")
    .trim()
    .toUpperCase();
  const numericAmount = Number(amount);

  if (!fromCode || !toCode || !Number.isFinite(numericAmount)) {
    return null;
  }

  const prices = await getMarketUsdPrices([fromCode, toCode]);
  const fromUsdPrice = Number(prices[fromCode]);
  const toUsdPrice = Number(prices[toCode]);

  if (
    !Number.isFinite(fromUsdPrice) ||
    !Number.isFinite(toUsdPrice) ||
    fromUsdPrice <= 0 ||
    toUsdPrice <= 0
  ) {
    return null;
  }

  const fromUsd = numericAmount * fromUsdPrice;
  const estimatedAmount = fromUsd / toUsdPrice;

  return {
    estimatedAmount: formatMarketAmount(estimatedAmount),
    amountFrom: String(amount),
    amountTo: formatMarketAmount(estimatedAmount),
    fromUsd,
    toUsd: fromUsd,
    rate: fromUsdPrice / toUsdPrice,
  };
}

async function getMarketUsdPrices(symbols) {
  const uniqueSymbols = Array.from(new Set(symbols.filter(Boolean)));
  const now = Date.now();
  const cached = marketPriceCache.expiresAt > now ? marketPriceCache.prices : {};
  const missing = uniqueSymbols.filter((symbol) => !Number(cached[symbol]));

  if (!missing.length) return cached;

  const response = await axios.get("https://min-api.cryptocompare.com/data/pricemulti", {
    timeout: Number(process.env.MARKET_PRICE_TIMEOUT_MS || 10000),
    params: {
      fsyms: missing.join(","),
      tsyms: "USD",
    },
  });
  const nextPrices = { ...cached };

  Object.entries(response.data || {}).forEach(([symbol, value]) => {
    const price = Number(value?.USD);
    if (Number.isFinite(price) && price > 0) {
      nextPrices[String(symbol).toUpperCase()] = price;
    }
  });

  marketPriceCache = {
    expiresAt: now + MARKET_PRICE_CACHE_MS,
    prices: nextPrices,
  };

  return nextPrices;
}

async function createTransaction(payload) {
  const amount = payload.amount || payload.depositAmount || payload.withdrawalAmount;
  validateAmount(amount);

  const fromCoin = await resolveCoin({
    ticker: payload.tickerFrom || payload.coinFrom,
    network: payload.networkFrom || payload.coinFromNetwork,
  });
  const toCoin = await resolveCoin({
    ticker: payload.tickerTo || payload.coinTo,
    network: payload.networkTo || payload.coinToNetwork,
  });
  const withdrawal = cleanAddress(payload.addressTo || payload.withdrawal);

  if (!withdrawal) {
    throw createError(400, "addressTo is required");
  }

  const requestBody = {
    coin_from: fromCoin.code,
    coin_to: toCoin.code,
    withdrawal,
    withdrawal_extra_id: payload.extraIdTo || payload.withdrawalExtraId || null,
    return: payload.userRefundAddress || payload.return || undefined,
    return_extra_id: payload.userRefundExtraId || payload.returnExtraId || null,
    float: !Boolean(payload.fixed),
    ...transactionNetworkPayload(payload),
  };

  if (payload.reverse) {
    requestBody.withdrawal_amount = amount;
  } else {
    requestBody.deposit_amount = amount;
  }

  if (AFFILIATE_ID) requestBody.affiliate_id = AFFILIATE_ID;

  const data = await request(
    "post",
    payload.reverse ? "/transaction-revert" : "/transaction",
    compact(requestBody)
  );

  return normalizeTransaction(data, {
    fromCoin,
    toCoin,
    fixed: Boolean(payload.fixed),
    reverse: Boolean(payload.reverse),
  });
}

async function getTransaction(id) {
  const transactionId = String(id || "").trim();

  if (!transactionId) {
    throw createError(400, "Transaction id is required");
  }

  const data = await request("get", `/transaction/${encodeURIComponent(transactionId)}`);
  return normalizeTransaction(data);
}

async function getTransactionStatus(id) {
  const transactionId = String(id || "").trim();

  if (!transactionId) {
    throw createError(400, "Transaction id is required");
  }

  const data = await request("get", `/transaction/${encodeURIComponent(transactionId)}/status`);
  return typeof data === "string" ? data : String(data?.status || "");
}

async function getTransactions() {
  requirePublicKey("Getting Godex transactions requires GODEX_PUBLIC_KEY");
  return request("get", "/transactions");
}

async function getBalance() {
  requirePublicKey("Getting Godex balance requires GODEX_PUBLIC_KEY");
  return request("get", "/balance");
}

async function getBalanceHistory() {
  requirePublicKey("Getting Godex balance history requires GODEX_PUBLIC_KEY");
  return request("get", "/history");
}

function normalizeTransaction(transaction, fallback = {}) {
  const id = transaction?.transaction_id || transaction?.id;

  if (!id) {
    throw createError(502, "Godex returned an invalid transaction response");
  }

  const coinFrom = transaction.coin_from || fallback.fromCoin?.code || "";
  const coinTo = transaction.coin_to || fallback.toCoin?.code || "";
  const withdrawalAmount =
    transaction.real_withdrawal_amount ||
    transaction.final_amount ||
    transaction.withdrawal_amount ||
    "";
  const depositAmount =
    transaction.real_deposit_amount || transaction.deposit_amount || "";
  const rawStatus = transaction.status || "wait";

  return {
    id,
    provider: "godex",
    status: mapStatus(rawStatus),
    amountFrom: String(depositAmount),
    amountTo: String(withdrawalAmount),
    tickerFrom: cleanTicker(coinFrom),
    networkFrom: normalizeNetwork(transaction.coin_from_network || coinFrom),
    tickerTo: cleanTicker(coinTo),
    networkTo: normalizeNetwork(transaction.coin_to_network || coinTo),
    addressFrom: transaction.deposit || "",
    addressTo: transaction.withdrawal || "",
    depositExtraId: transaction.deposit_extra_id || null,
    depositExtraName: fallback.fromCoin?.extra_name || null,
    withdrawalExtraId: transaction.withdrawal_extra_id || null,
    refundAddress: transaction.return || "",
    refundExtraId: transaction.return_extra_id || null,
    createdAt: transaction.created_at || new Date().toISOString(),
    completedAt: mapStatus(rawStatus) === "finished" ? transaction.updated_at || "" : "",
    godex: {
      transactionId: id,
      status: rawStatus,
      statusMessage: STATUS_MESSAGES[rawStatus] || "",
      depositAddress: transaction.deposit || "",
      depositExtraId: transaction.deposit_extra_id || null,
      depositExtraName: fallback.fromCoin?.extra_name || null,
      depositHash: transaction.hash_in || null,
      receiveHash: transaction.hash_out || null,
      rate: transaction.rate ?? null,
      fee: transaction.fee ?? null,
      finalAmount: transaction.final_amount ?? null,
      realDepositAmount: transaction.real_deposit_amount ?? null,
      realWithdrawalAmount: transaction.real_withdrawal_amount ?? null,
      executionTime: transaction.execution_time ?? null,
      fixed: fallback.fixed,
      reverse: fallback.reverse,
    },
  };
}

function toCurrency(coin) {
  const code = String(coin?.code || "").trim();
  if (!code) return null;

  const enabled = Number(coin.disabled || 0) === 0;

  return {
    ticker: cleanTicker(code),
    network: normalizeNetwork(code),
    name: String(coin.name || code).trim(),
    image: normalizeIconUrl(coin.icon || fallbackIconUrl(code)),
    enabled,
    isFiat: false,
    isAvailableFixed: enabled,
    isAvailableFloat: enabled,
    hasExtra: Number(coin.has_extra || 0) === 1,
    extraName: coin.extra_name || null,
    explorer: coin.explorer || null,
    godex: {
      code,
      hasExtra: Number(coin.has_extra || 0) === 1,
      extraName: coin.extra_name || null,
      explorer: coin.explorer || null,
      disabled: Number(coin.disabled || 0),
    },
  };
}

async function resolveCoin(currencyLike) {
  const code =
    currencyLike?.godex?.code ||
    currencyLike?.code ||
    currencyLike?.ticker ||
    currencyLike?.symbol;
  const normalizedCode = String(code || "").trim().toUpperCase();

  if (!normalizedCode) {
    throw createError(400, "Currency is required");
  }

  const coins = await getCoins();
  const coin = coins.find((candidate) => {
    return String(candidate?.code || "").trim().toUpperCase() === normalizedCode;
  });

  if (!coin) {
    throw createError(400, `Unsupported Godex coin: ${normalizedCode}`);
  }

  if (Number(coin.disabled || 0) !== 0) {
    throw createError(400, `${normalizedCode} is currently unavailable on Godex`);
  }

  return {
    ...coin,
    code: normalizedCode,
  };
}

async function request(method, endpoint, payload) {
  try {
    const response = await client.request({
      method,
      url: endpoint,
      data: payload,
      headers: authHeaders(),
    });

    return response.data;
  } catch (error) {
    if (error.status) throw error;

    const providerBody = error?.response?.data;
    const providerMessage =
      providerBody?.message ||
      providerBody?.error ||
      providerBody?.errors?.[0]?.message ||
      (typeof providerBody === "string" ? providerBody : "");
    const status = error?.response?.status || 502;

    throw createError(
      providerStatusToHttpStatus(status),
      providerMessage || error.message || "Godex request failed",
      {
        code: providerBody?.code,
        details: providerBody,
        retryable: status === 429 || status >= 500,
      }
    );
  }
}

async function getUsdValue(coin, amount) {
  const code = String(coin?.code || "").trim().toUpperCase();
  const numericAmount = Number(amount);

  if (!code || !Number.isFinite(numericAmount) || numericAmount <= 0) {
    return 0;
  }

  if (USD_STABLE_CODES.has(code)) {
    return numericAmount;
  }

  const stableCoin = await getUsdStableCoin();
  if (!stableCoin || stableCoin.code === code) return 0;

  try {
    const data = await request("post", "/info", {
      from: code,
      to: stableCoin.code,
      amount: String(amount),
      float: true,
    });
    const usdAmount = Number(data?.amount);

    if (Number.isFinite(usdAmount) && usdAmount > 0) {
      return usdAmount;
    }
  } catch {
    // Fall back to a cached/sample unit price below.
  }

  const unitPrice = await getUsdUnitPrice(coin, stableCoin);
  return unitPrice > 0 ? numericAmount * unitPrice : 0;
}

async function getUsdUnitPrice(coin, stableCoin) {
  const code = String(coin?.code || "").trim().toUpperCase();
  const cacheKey = `${code}:${stableCoin.code}`;
  const cached = usdPriceCache.get(cacheKey);

  if (cached && cached.expiresAt > Date.now()) {
    return cached.price;
  }

  for (const sampleAmount of USD_PRICE_SAMPLE_AMOUNTS) {
    try {
      const data = await request("post", "/info", {
        from: code,
        to: stableCoin.code,
        amount: sampleAmount,
        float: true,
      });
      const usdAmount = Number(data?.amount);
      const sample = Number(sampleAmount);

      if (Number.isFinite(usdAmount) && usdAmount > 0 && sample > 0) {
        const price = usdAmount / sample;
        usdPriceCache.set(cacheKey, {
          price,
          expiresAt: Date.now() + USD_PRICE_CACHE_MS,
        });
        return price;
      }
    } catch {
      // Try another sample size; this data is display-only.
    }
  }

  usdPriceCache.set(cacheKey, {
    price: 0,
    expiresAt: Date.now() + USD_PRICE_CACHE_MS,
  });
  return 0;
}

async function getUsdStableCoin() {
  const coins = await getCoins();

  for (const code of ["USDT", "USDC"]) {
    const coin = coins.find((candidate) => {
      return (
        String(candidate?.code || "").trim().toUpperCase() === code &&
        Number(candidate?.disabled || 0) === 0
      );
    });

    if (coin) {
      return {
        ...coin,
        code,
      };
    }
  }

  return null;
}

function authHeaders() {
  return PUBLIC_KEY ? { "public-key": PUBLIC_KEY } : {};
}

function requirePublicKey(message) {
  if (!PUBLIC_KEY) {
    throw createError(500, message);
  }
}

function networkPayload(from, to) {
  return compact({
    network_from: getExplicitNetwork(from),
    network_to: getExplicitNetwork(to),
  });
}

function transactionNetworkPayload(payload) {
  return compact({
    coin_from_network:
      payload.coinFromNetwork || getExplicitNetwork({
        ticker: payload.tickerFrom || payload.coinFrom,
        network: payload.networkFrom,
      }),
    coin_to_network:
      payload.coinToNetwork || getExplicitNetwork({
        ticker: payload.tickerTo || payload.coinTo,
        network: payload.networkTo,
      }),
  });
}

function getExplicitNetwork(currencyLike) {
  const network =
    currencyLike?.godex?.network ||
    currencyLike?.coinNetwork ||
    currencyLike?.network;
  const ticker =
    currencyLike?.godex?.code ||
    currencyLike?.ticker ||
    currencyLike?.symbol ||
    currencyLike?.code;
  const normalizedNetwork = String(network || "").trim().toUpperCase();
  const normalizedTicker = String(ticker || "").trim().toUpperCase();

  if (!normalizedNetwork) return undefined;

  // The frontend needs a network key, while Godex can choose the default
  // network when no explicit chain is supplied.
  if (normalizedNetwork === normalizedTicker) return undefined;

  return normalizedNetwork;
}

function mapStatus(status) {
  switch (String(status || "").toLowerCase()) {
    case "success":
      return "finished";
    case "confirmation":
    case "confirmed":
      return "confirming";
    case "exchanging":
    case "sending":
    case "sending_confirmation":
      return "sending";
    case "refunded":
      return "refunded";
    case "overdue":
    case "error":
      return "failed";
    case "wait":
      return "waiting";
    default:
      return status ? String(status).toLowerCase() : "created";
  }
}

function validateAmount(value) {
  const raw = String(value ?? "").trim();

  if (!/^\d+(\.\d+)?$/.test(raw) || Number(raw) <= 0) {
    throw createError(400, "Amount should be a valid positive number");
  }
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

function compact(value) {
  return Object.entries(value).reduce((result, [key, entry]) => {
    if (entry !== undefined && entry !== "") result[key] = entry;
    return result;
  }, {});
}

function coin(code, name) {
  return {
    code,
    name,
    disabled: 0,
    has_extra: 0,
    icon: fallbackIconUrl(code),
  };
}

function fallbackIconUrl(code) {
  return `https://cdn.jsdelivr.net/npm/cryptocurrency-icons@0.18.1/svg/color/${String(
    code || ""
  ).toLowerCase()}.svg`;
}

function normalizeIconUrl(value) {
  return String(value || "").trim().replace(/^http:\/\//i, "https://");
}

function formatMarketAmount(value) {
  if (!Number.isFinite(value) || value <= 0) return "";
  if (value >= 1) return parseFloat(value.toPrecision(8)).toString();
  return parseFloat(value.toPrecision(6)).toString();
}

function providerStatusToHttpStatus(status) {
  if (status >= 400 && status < 500) return status;
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
  getBalance,
  getBalanceHistory,
  getCoins,
  getCurrencies,
  getPairMap,
  getRange,
  getMarketEstimate,
  getUsdValues,
  getTransaction,
  getTransactionStatus,
  getTransactions,
  mapStatus,
  quote,
};
