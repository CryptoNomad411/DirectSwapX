const axios = require("axios");
const axiosRetry = require("axios-retry").default;

const API_BASE_URL = process.env.RABBIT_API_BASE_URL || "https://api.rabbit.io";
const API_KEY = process.env.RABBIT_API_KEY || "";
const AFFILIATE_CODE = process.env.RABBIT_AFFILIATE_CODE || "";
const COIN_CACHE_MS = Number(process.env.RABBIT_COIN_CACHE_MS || 5 * 60 * 1000);
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
  timeout: Number(process.env.RABBIT_TIMEOUT_MS || 20000),
  headers: { Accept: "application/json", "Content-Type": "application/json" },
});

axiosRetry(client, {
  retries: 2,
  retryDelay: axiosRetry.exponentialDelay,
  retryCondition(error) {
    return axiosRetry.isNetworkOrIdempotentRequestError(error) ||
      error?.response?.status === 429 || error?.response?.status >= 500;
  },
});

let assetCache = { expiresAt: 0, assets: [] };
const usdPriceCache = new Map();

async function getAssets({ force = false } = {}) {
  if (!force && assetCache.expiresAt > Date.now() && assetCache.assets.length) {
    return assetCache.assets;
  }

  const data = await request("get", "/asset", undefined, { count: 1000 });
  const assets = data?.responseObject?.assets;
  if (!Array.isArray(assets)) throw createError(502, "Rabbit returned an invalid assets response");

  assetCache = { expiresAt: Date.now() + COIN_CACHE_MS, assets };
  return assets;
}

async function getCurrencies() {
  return (await getAssets()).map(toCurrency).filter(Boolean);
}

async function getPairMap() {
  return (await getCurrencies()).reduce((map, currency) => {
    if (currency.enabled !== false) map[currencyKey(currency)] = ["*"];
    return map;
  }, {});
}

async function quote({ from, to, amount, fixed = false, reverse = false, withdrawalAddress }) {
  validateAmount(amount);
  const fromAsset = await resolveAsset(from);
  const toAsset = await resolveAsset(to);
  const response = await request("get", "/estimateSwap", undefined, {
    tickerFrom: fromAsset.ticker,
    tickerTo: toAsset.ticker,
    amountCoins: String(amount),
    fixed: String(Boolean(fixed)),
    amountIsToReceive: String(Boolean(reverse)),
    withoutFiat: "false",
    withdrawalAddress: cleanAddress(withdrawalAddress) || undefined,
    affiliateCode: AFFILIATE_CODE || undefined,
  });
  const estimate = response?.responseObject;
  if (!estimate?.result || !estimate?.estimationId || !estimate?.swapCreationInfo) {
    throw createError(400, estimate?.reason || response?.message || "Rabbit could not create an estimate");
  }
  const info = estimate.swapCreationInfo;
  return {
    data: {
      amount: reverse ? info.fromAmountCoins : info.toAmountCoins,
      min_amount: info.min,
      max_amount: info.max,
      rate: info.rate,
      rate_uuid: estimate.estimationId,
      rate_expired_at: null,
      fiat_min: info.fiatMin,
      fiat_max: info.fiatMax,
      fixed: info.fixed,
    },
    raw: estimate,
    fromCoin: fromAsset,
    toCoin: toAsset,
    request: { tickerFrom: fromAsset.ticker, tickerTo: toAsset.ticker, amountCoins: String(amount), fixed: Boolean(fixed), reverse: Boolean(reverse) },
    reverse: Boolean(reverse),
  };
}

async function getRange(payload) {
  const result = await quote({ ...payload, amount: Number(payload.amount) > 0 ? payload.amount : "1" });
  return { min: result.data.min_amount ?? null, max: result.data.max_amount ?? null, unlimitedMax: !result.data.max_amount, quote: result };
}

async function getUsdValues({ fromCoin, toCoin, fromAmount, toAmount }) {
  // Rabbit provides fiat limits, rather than the value of this exact quote.
  // Use reference prices solely for the UI's approximate USD labels.
  const [fromUsd, toUsd] = await Promise.all([
    getUsdValue(fromCoin, fromAmount),
    getUsdValue(toCoin, toAmount),
  ]);

  // A display-only price lookup must never make an otherwise valid quote fail.
  return { fromUsd: fromUsd || toUsd || 0, toUsd: toUsd || fromUsd || 0 };
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
    const response = await axios.get(`https://api.coinbase.com/v2/prices/${encodeURIComponent(ticker)}-USD/spot`, {
      timeout: MARKET_PRICE_TIMEOUT_MS,
    });
    const price = Number(response.data?.data?.amount);
    const validPrice = Number.isFinite(price) && price > 0 ? price : 0;
    usdPriceCache.set(ticker, { price: validPrice, expiresAt: Date.now() + USD_PRICE_CACHE_MS });
    return validPrice;
  } catch {
    // USD labels are optional; keep the exchange quote usable if the price feed is down.
    return 0;
  }
}

async function getMarketEstimate() { return null; }

async function createTransaction(payload) {
  const amount = payload.amount || payload.depositAmount || payload.withdrawalAmount;
  validateAmount(amount);
  const fromAsset = await resolveAsset({ ticker: payload.tickerFrom || payload.coinFrom, network: payload.networkFrom || payload.coinFromNetwork });
  const toAsset = await resolveAsset({ ticker: payload.tickerTo || payload.coinTo, network: payload.networkTo || payload.coinToNetwork });
  const recipientAddress = cleanAddress(payload.addressTo || payload.withdrawal);
  if (!recipientAddress) throw createError(400, "addressTo is required");

  const estimation = await quote({ from: fromAsset, to: toAsset, amount, fixed: payload.fixed, reverse: payload.reverse, withdrawalAddress: recipientAddress });
  const response = await request("post", "/swap", {
    estimationId: estimation.raw.estimationId,
    tickerFrom: fromAsset.ticker,
    tickerTo: toAsset.ticker,
    amountCoins: String(amount),
    amountIsToReceive: String(Boolean(payload.reverse)),
    isFixed: String(Boolean(payload.fixed)),
    recipientAddress,
    recipientAddressExtraId: payload.extraIdTo || payload.withdrawalExtraId || undefined,
    refundAddress: payload.userRefundAddress || payload.return || undefined,
    refundAddressExtraId: payload.userRefundExtraId || payload.returnExtraId || undefined,
    affiliateCode: AFFILIATE_CODE || undefined,
  });
  const swap = response?.responseObject;
  if (!swap?.result && !swap?.swapId) throw createError(400, swap?.reason || response?.message || "Rabbit could not create the swap");
  return normalizeTransaction(swap, { fromAsset, toAsset, fixed: Boolean(payload.fixed), reverse: Boolean(payload.reverse) });
}

async function getTransaction(id) {
  const swapId = String(id || "").trim();
  if (!swapId) throw createError(400, "Transaction id is required");
  const response = await request("get", "/swap", undefined, { swapIds: swapId, forceReload: "true" });
  const swap = Array.isArray(response?.responseObject) ? response.responseObject[0] : response?.responseObject;
  if (!swap) throw createError(404, "Rabbit swap was not found");
  return normalizeTransaction(swap);
}

async function getTransactionStatus(id) { return (await getTransaction(id)).rabbit.status; }

function normalizeTransaction(swap, fallback = {}) {
  const id = swap?.swapId;
  if (!id) throw createError(502, "Rabbit returned an invalid swap response");
  const rawStatus = swap.status || "waiting_for_payment";
  return {
    id,
    provider: "rabbit",
    status: mapStatus(rawStatus),
    amountFrom: String(swap.fromAmount || ""),
    amountTo: String(swap.toAmount || ""),
    tickerFrom: cleanTicker(swap.fromCoinTicker || fallback.fromAsset?.ticker),
    networkFrom: cleanTicker(fallback.fromAsset?.protocol || swap.fromCoinTicker),
    tickerTo: cleanTicker(swap.toCoinTicker || fallback.toAsset?.ticker),
    networkTo: cleanTicker(fallback.toAsset?.protocol || swap.toCoinTicker),
    addressFrom: swap.payToAddress || "",
    addressTo: swap.toAddress || "",
    depositExtraId: swap.fromExtraId || null,
    depositExtraName: null,
    refundAddress: swap.refundAddress || "",
    refundExtraId: swap.refundExtraId || null,
    createdAt: swap.createdAt ? new Date(swap.createdAt).toISOString() : new Date().toISOString(),
    completedAt: mapStatus(rawStatus) === "finished" ? new Date().toISOString() : "",
    rabbit: { swapId: id, status: rawStatus, depositAddress: swap.payToAddress || "", depositExtraId: swap.fromExtraId || null, depositHash: swap.fromTransactionId || null, receiveHash: swap.toTransactionId || null, rate: swap.rate || null, fixed: swap.fixed ?? fallback.fixed, reverse: fallback.reverse },
  };
}

function toCurrency(asset) {
  const ticker = String(asset?.prettyTicker || "").trim();
  if (!ticker) return null;
  const protocol = String(asset.protocol || ticker).trim();
  const extra = Array.isArray(asset.extraIdsInfo) ? asset.extraIdsInfo.find((entry) => entry?.hasExtraId) : null;
  return { ticker: cleanTicker(ticker), network: cleanTicker(protocol), name: asset.name || ticker, image: asset.iconUrl || fallbackIconUrl(ticker), enabled: !asset?.deactivation?.flag, isFiat: false, isAvailableFixed: !asset?.deactivation?.flag, isAvailableFloat: !asset?.deactivation?.flag, hasExtra: Boolean(extra), extraName: extra?.extraIdName || null, rabbit: { ticker, protocol, hasExtra: Boolean(extra), extraName: extra?.extraIdName || null, deactivation: asset.deactivation || null } };
}

async function resolveAsset(currencyLike) {
  const requestedTicker = String(currencyLike?.rabbit?.ticker || currencyLike?.ticker || currencyLike?.code || currencyLike?.symbol || "").trim().toUpperCase();
  const requestedNetwork = String(currencyLike?.rabbit?.protocol || currencyLike?.network || "").trim().toUpperCase();
  const asset = (await getAssets()).find((candidate) => String(candidate?.prettyTicker || "").toUpperCase() === requestedTicker && (!requestedNetwork || requestedNetwork === requestedTicker || String(candidate?.protocol || "").toUpperCase() === requestedNetwork));
  if (!asset) throw createError(400, `Unsupported Rabbit asset: ${requestedTicker}`);
  if (asset?.deactivation?.flag) throw createError(400, `${requestedTicker} is currently unavailable on Rabbit`);
  return { ...asset, ticker: String(asset.prettyTicker).toUpperCase(), protocol: asset.protocol || asset.prettyTicker };
}

async function request(method, url, data, params) {
  try {
    const response = await client.request({ method, url, data: compact(data), params: compact(params), headers: API_KEY ? { "x-api-key": API_KEY } : {} });
    return response.data;
  } catch (error) {
    const body = error?.response?.data;
    const status = error?.response?.status || 502;
    throw createError(status >= 400 && status < 500 ? status : 502, body?.message || body?.responseObject?.reason || error.message || "Rabbit request failed", { code: body?.code, details: body, retryable: status === 429 || status >= 500 });
  }
}

function mapStatus(status) { switch (String(status || "").toLowerCase()) { case "completed": return "finished"; case "confirming": case "payment_received": case "verifying": return "confirming"; case "exchanging": return "sending"; case "refunded": return "refunded"; case "expired": case "failed": return "failed"; case "waiting_for_payment": return "waiting"; default: return status ? String(status).toLowerCase() : "created"; } }
function validateAmount(value) { if (!/^\d+(\.\d+)?$/.test(String(value ?? "").trim()) || Number(value) <= 0) throw createError(400, "Amount should be a valid positive number"); }
function cleanTicker(value) { return String(value || "").trim().toLowerCase(); }
function marketTicker(coin) {
  return String(coin?.prettyTicker || coin?.ticker || coin?.symbol || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}
function cleanAddress(value) { return String(value || "").trim(); }
function currencyKey(currency) { return `${cleanTicker(currency.ticker)}:${cleanTicker(currency.network)}`; }
function compact(value = {}) { return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined && item !== null && item !== "")); }
function fallbackIconUrl(ticker) { return `https://cdn.jsdelivr.net/npm/cryptocurrency-icons@0.18.1/svg/color/${cleanTicker(ticker)}.svg`; }
function createError(status, message, extras = {}) { const error = new Error(message); error.status = status; Object.assign(error, extras); return error; }

module.exports = { createTransaction, getAssets, getCurrencies, getPairMap, getRange, getMarketEstimate, getTransaction, getTransactionStatus, getUsdValues, mapStatus, quote };
