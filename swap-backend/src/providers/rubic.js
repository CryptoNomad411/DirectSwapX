const crypto = require("crypto");
const axios = require("axios");
const axiosRetry = require("axios-retry").default;

const API_BASE_URL =
  process.env.RUBIC_API_BASE_URL || "https://api-v2.rubic.exchange/api";
const REFERRER = process.env.RUBIC_REFERRER || "directswapx";
const TOKEN_CACHE_MS = Number(process.env.RUBIC_TOKEN_CACHE_MS || 5 * 60 * 1000);
const CHAIN_CACHE_MS = Number(process.env.RUBIC_CHAIN_CACHE_MS || 15 * 60 * 1000);
const TOKENS_PER_CHAIN = Number(process.env.RUBIC_TOKENS_PER_CHAIN || 80);
const SLIPPAGE = Number(process.env.RUBIC_SLIPPAGE || 0.03);
const QUOTE_TIMEOUT_SECONDS = Number(process.env.RUBIC_TIMEOUT_SECONDS || 30);
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const DEPOSIT_PROVIDER_PRIORITY = String(
  process.env.RUBIC_DEPOSIT_PROVIDER_PRIORITY ||
    "changelly,changenow,simpleswap,exolix,changehero,stealthex,letsexchange,godex,fixedfloat"
)
  .split(",")
  .map((provider) => provider.trim().toLowerCase())
  .filter(Boolean);
const DEPOSIT_ROUTE_ATTEMPT_COUNT = Number(
  process.env.RUBIC_DEPOSIT_ROUTE_ATTEMPTS || 4
);
const DEPOSIT_ROUTE_ATTEMPTS =
  Number.isFinite(DEPOSIT_ROUTE_ATTEMPT_COUNT) && DEPOSIT_ROUTE_ATTEMPT_COUNT > 0
    ? Math.floor(DEPOSIT_ROUTE_ATTEMPT_COUNT)
    : 4;
const KNOWN_TOKEN_IMAGES = {
  "SOLANA:SOL":
    "https://api-assets.rubic.exchange/assets/coingecko/solana/so11111111111111111111111111111111111111111/logo.png",
};

const SUPPORTED_CHAINS = {
  ETH: {
    network: "eth",
    label: "Ethereum",
    chainId: 1,
    nativeSymbol: "ETH",
    nativeDecimals: 18,
    type: "EVM",
  },
  BSC: {
    network: "bsc",
    label: "BNB Smart Chain",
    chainId: 56,
    nativeSymbol: "BNB",
    nativeDecimals: 18,
    type: "EVM",
  },
  POLYGON: {
    network: "polygon",
    label: "Polygon",
    chainId: 137,
    nativeSymbol: "MATIC",
    nativeDecimals: 18,
    type: "EVM",
  },
  ARBITRUM: {
    network: "arbitrum",
    label: "Arbitrum",
    chainId: 42161,
    nativeSymbol: "ETH",
    nativeDecimals: 18,
    type: "EVM",
  },
  OPTIMISM: {
    network: "optimism",
    label: "Optimism",
    chainId: 10,
    nativeSymbol: "ETH",
    nativeDecimals: 18,
    type: "EVM",
  },
  BASE: {
    network: "base",
    label: "Base",
    chainId: 8453,
    nativeSymbol: "ETH",
    nativeDecimals: 18,
    type: "EVM",
  },
  AVALANCHE: {
    network: "avalanche",
    label: "Avalanche",
    chainId: 43114,
    nativeSymbol: "AVAX",
    nativeDecimals: 18,
    type: "EVM",
  },
  SOLANA: {
    network: "sol",
    label: "Solana",
    chainId: 7565164,
    nativeSymbol: "SOL",
    nativeDecimals: 9,
    type: "SOLANA",
  },
};

const CHAIN_ALIASES = Object.entries(SUPPORTED_CHAINS).reduce(
  (aliases, [blockchain, chain]) => {
    aliases[blockchain.toLowerCase()] = blockchain;
    aliases[chain.network] = blockchain;
    aliases[chain.label.toLowerCase()] = blockchain;
    return aliases;
  },
  {
    avax: "AVALANCHE",
    avaxc: "AVALANCHE",
    matic: "POLYGON",
    op: "OPTIMISM",
    ethereum: "ETH",
    sol: "SOLANA",
    solana: "SOLANA",
  }
);

const client = axios.create({
  baseURL: API_BASE_URL.replace(/\/+$/, ""),
  timeout: Number(process.env.RUBIC_HTTP_TIMEOUT_MS || 30000),
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
});

axiosRetry(client, {
  retries: 1,
  retryDelay: axiosRetry.exponentialDelay,
  retryCondition(error) {
    if (axiosRetry.isNetworkOrIdempotentRequestError(error)) return true;
    const status = error?.response?.status || 0;
    return status === 429 || status >= 500;
  },
});

let tokenCache = {
  expiresAt: 0,
  currencies: [],
};
let chainCache = {
  expiresAt: 0,
  chains: [],
};

async function getChains({ force = false } = {}) {
  const now = Date.now();

  if (!force && chainCache.expiresAt > now && chainCache.chains.length) {
    return chainCache.chains;
  }

  const chains = await request("get", "/info/chains");

  if (!Array.isArray(chains)) {
    throw createError(502, "Rubic returned an invalid chains response");
  }

  chainCache = {
    expiresAt: now + CHAIN_CACHE_MS,
    chains,
  };

  return chains;
}

async function getCurrencies({ force = false } = {}) {
  const now = Date.now();

  if (!force && tokenCache.expiresAt > now && tokenCache.currencies.length) {
    return tokenCache.currencies;
  }

  const tokenPages = await Promise.all(
    Object.keys(SUPPORTED_CHAINS).map((network) => {
      return request("get", "/tokens/", null, {
        network,
        pageSize: TOKENS_PER_CHAIN,
      });
    })
  );
  const currencies = tokenPages
    .flatMap((page) => (Array.isArray(page?.results) ? page.results : []))
    .map(toCurrency)
    .filter(Boolean)
    .sort(compareCurrencies);
  const uniqueCurrencies = uniqueByCurrencyKey(currencies);

  tokenCache = {
    expiresAt: now + TOKEN_CACHE_MS,
    currencies: uniqueCurrencies,
  };

  return uniqueCurrencies;
}

async function getPairMap() {
  const currencies = await getCurrencies();

  return currencies.reduce((map, currency) => {
    if (currency.enabled !== false) map[currencyKey(currency)] = ["*"];
    return map;
  }, {});
}

async function quote({ from, to, amount, fromAddress, receiver }) {
  validateAmount(amount);

  const fromToken = await resolveToken(from);
  const toToken = await resolveToken(to);
  const requestBody = buildQuoteRequest({
    fromToken,
    toToken,
    amount,
    fromAddress,
    receiver,
  });
  const data = await request("post", "/routes/quoteBest", requestBody);

  if (!data?.id || !data?.estimate) {
    throw createError(502, "Rubic returned an invalid quote response", {
      details: data,
    });
  }

  return {
    data,
    request: requestBody,
    fromToken,
    toToken,
  };
}

async function quoteDeposit({ from, to, amount, fromAddress, receiver }) {
  validateAmount(amount);

  const fromToken = await resolveToken(from);
  const toToken = await resolveToken(to);
  const requestBody = buildQuoteRequest({
    fromToken,
    toToken,
    amount,
    fromAddress,
    receiver,
    depositTradeParams: "onlyDeposits",
    useDepositTradeIfAvailable: true,
  });
  const data = await request("post", "/routes/quoteDepositTrades", requestBody);
  const routes = Array.isArray(data?.routes) ? data.routes : [];
  const rankedRoutes = rankDepositRoutes(routes);
  const route = rankedRoutes[0];

  if (!data?.quote || !route?.id || !route?.estimate) {
    throw createError(502, "Rubic returned an invalid deposit quote response", {
      details: data,
    });
  }

  return {
    data: route,
    request: {
      ...data.quote,
      preferredProvider: route.providerType || data.quote.preferredProvider,
    },
    fromToken,
    toToken,
    depositRoutes: rankedRoutes,
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

  if (!cleanAddress(payload.addressTo)) {
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
    fromAddress: payload.fromAddress,
    receiver: payload.addressTo,
  });

  return normalizeExchangeRecord({
    id: createExchangeId(),
    payload,
    quoteData,
    status: "created",
  });
}

async function prepareExchangeTransaction(exchange, payload = {}) {
  const fromAddress = cleanAddress(payload.fromAddress);

  if (!fromAddress) {
    throw createError(400, "fromAddress is required to prepare a Rubic swap");
  }

  const receiver = cleanAddress(payload.receiver || exchange.addressTo);

  if (!receiver) {
    throw createError(400, "receiver is required to prepare a Rubic swap");
  }

  const amount = exchange.amountFrom;
  const fromCurrency = exchange.rubic?.fromCurrency || {
    ticker: exchange.tickerFrom,
    network: exchange.networkFrom,
  };
  const toCurrency = exchange.rubic?.toCurrency || {
    ticker: exchange.tickerTo,
    network: exchange.networkTo,
  };
  const manualDeposit = Boolean(payload.manualDeposit || payload.depositOnly);

  if (manualDeposit && hasPreparedDepositAddress(exchange)) {
    return normalizePreparedDepositExchange(exchange, fromAddress);
  }

  const quoteData = manualDeposit
    ? await quoteDeposit({
        from: fromCurrency,
        to: toCurrency,
        amount,
        fromAddress,
        receiver,
      })
    : await quote({
        from: fromCurrency,
        to: toCurrency,
        amount,
        fromAddress,
        receiver,
      });

  const preparedSwap = manualDeposit
    ? await prepareDepositSwap({
        quoteData,
        fromAddress,
        receiver,
      })
    : {
        quoteData,
        swapData: await request(
          "post",
          "/routes/swap",
          buildSwapRequest({
            quoteData,
            fromAddress,
            receiver,
            manualDeposit,
          })
        ),
        attempts: [],
      };

  const approval = await getApproval({
    quoteData: preparedSwap.quoteData,
    swapData: preparedSwap.swapData,
    fromAddress,
  });

  return normalizeExchangeRecord({
    id: exchange.id,
    payload: {
      tickerFrom: exchange.tickerFrom,
      networkFrom: exchange.networkFrom,
      tickerTo: exchange.tickerTo,
      networkTo: exchange.networkTo,
      amount,
      addressTo: receiver,
      userRefundAddress: manualDeposit ? fromAddress : exchange.refundAddress,
    },
    quoteData: preparedSwap.quoteData,
    swapData: preparedSwap.swapData,
    approval,
    existing: exchange,
    status: "waiting",
    depositRouteAttempts: preparedSwap.attempts,
    });
}

function hasPreparedDepositAddress(exchange) {
  return Boolean(
    cleanAddress(exchange?.rubic?.depositAddress || exchange?.addressFrom) &&
      exchange?.rubic?.needsWallet === false
  );
}

function normalizePreparedDepositExchange(exchange, fromAddress) {
  const depositAddress = cleanAddress(
    exchange.rubic?.depositAddress || exchange.addressFrom
  );

  return {
    ...exchange,
    status: exchange.status === "created" ? "waiting" : exchange.status,
    addressFrom: depositAddress,
    refundAddress: fromAddress || exchange.refundAddress,
    rubic: {
      ...(exchange.rubic || {}),
      executionType: "deposit",
      needsWallet: false,
      depositAddress,
      amountToSend: exchange.rubic?.amountToSend || exchange.amountFrom,
      statusError: "",
    },
  };
}

async function prepareDepositSwap({ quoteData, fromAddress, receiver }) {
  const candidates = getDepositQuoteCandidates(quoteData).slice(
    0,
    DEPOSIT_ROUTE_ATTEMPTS
  );
  const attempts = [];
  let lastError = null;

  for (const candidate of candidates) {
    const providerType = getRouteProvider(candidate.data);

    try {
      const swapData = await request(
        "post",
        "/routes/swap",
        buildSwapRequest({
          quoteData: candidate,
          fromAddress,
          receiver,
          manualDeposit: true,
        })
      );

      if (cleanAddress(swapData?.transaction?.depositAddress)) {
        attempts.push({
          providerType,
          routeId: candidate.data?.id || "",
          success: true,
        });

        return {
          quoteData: candidate,
          swapData,
          attempts,
        };
      }

      lastError = createError(
        502,
        "Rubic did not return a manual deposit address for this route",
        {
          details: swapData,
        }
      );
      attempts.push({
        providerType,
        routeId: candidate.data?.id || "",
        success: false,
        message: lastError.message,
      });
    } catch (error) {
      lastError = error;
      attempts.push({
        providerType,
        routeId: candidate.data?.id || "",
        success: false,
        status: error?.status || 502,
        message: error?.message || "Rubic route failed",
        retryable: Boolean(error?.retryable),
      });
    }
  }

  throw createError(
    502,
    "Rubic could not create a deposit address for this route. Please wait a few seconds and try again.",
    {
      retryable: true,
      details: {
        attempts,
        lastError: lastError
          ? {
              message: lastError.message,
              status: lastError.status,
              code: lastError.code,
            }
          : null,
      },
    }
  );
}

function confirmExchange(exchange, payload = {}) {
  const txHash = cleanAddress(payload.txHash || payload.hash || payload.depositHash);

  return {
    ...exchange,
    status: txHash ? "sending" : exchange.status,
    rubic: {
      ...(exchange.rubic || {}),
      depositHash: txHash || exchange.rubic?.depositHash || "",
      remoteStatus: txHash ? "submitted" : exchange.rubic?.remoteStatus || "",
    },
  };
}

async function refreshExchangeStatus(exchange) {
  if (!exchange || exchange.provider !== "rubic") return exchange;

  const statusId = cleanAddress(
    exchange.rubic?.quoteId ||
      exchange.rubic?.quoteRequest?.id ||
      exchange.rubic?.request?.id
  );

  if (!statusId) return exchange;

  try {
    const statusData = await request("get", "/info/statusExtended", null, compact({
      id: statusId,
      srcTxHash: cleanAddress(exchange.rubic?.depositHash),
    }));

    return applyRemoteStatus(exchange, statusData);
  } catch (error) {
    return {
      ...exchange,
      rubic: {
        ...(exchange.rubic || {}),
        statusCheckedAt: new Date().toISOString(),
        statusError: error.message || "Rubic status refresh failed",
      },
    };
  }
}

function applyRemoteStatus(exchange, statusData = {}) {
  const remoteStatus = cleanAddress(statusData.status).toUpperCase();
  const nextStatus = mapRemoteStatus(remoteStatus, exchange.status);
  const destinationHash = cleanAddress(
    statusData.destinationTxHash || statusData.dstTxHash || statusData.txHash
  );
  const sourceHash = cleanAddress(statusData.sourceTxHash || statusData.srcTxHash);
  const toAmount = isValidAmount(statusData.toAmount)
    ? stringifyAmount(statusData.toAmount)
    : exchange.amountTo;
  const finished = nextStatus === "finished";

  return {
    ...exchange,
    status: nextStatus,
    amountTo: toAmount || exchange.amountTo,
    completedAt:
      finished && !exchange.completedAt ? new Date().toISOString() : exchange.completedAt,
    rubic: {
      ...(exchange.rubic || {}),
      remoteStatus,
      remoteSubStatus: statusData.subStatus ?? exchange.rubic?.remoteSubStatus ?? null,
      statusCheckedAt: new Date().toISOString(),
      receiveHash: destinationHash || exchange.rubic?.receiveHash || "",
      destinationTxHash:
        destinationHash || exchange.rubic?.destinationTxHash || "",
      depositHash: sourceHash || exchange.rubic?.depositHash || "",
      statusExtended: statusData,
      statusError: "",
    },
  };
}

function mapRemoteStatus(remoteStatus, fallbackStatus = "waiting") {
  switch (remoteStatus) {
    case "SUCCESS":
    case "COMPLETED":
    case "FINISHED":
      return "finished";
    case "FAILED":
    case "FAIL":
    case "CANCELLED":
    case "CANCELED":
      return "failed";
    case "REFUNDED":
      return "refunded";
    case "PENDING":
    case "PROCESSING":
    case "IN_PROGRESS":
    case "CONFIRMING":
    case "EXCHANGING":
    case "SENDING":
    case "RECEIVED":
    case "DEPOSIT_RECEIVED":
      return "sending";
    case "WAITING":
    case "WAIT":
    case "CREATED":
      return "waiting";
    default:
      return fallbackStatus || "waiting";
  }
}

async function getApproval({ quoteData, swapData, fromAddress }) {
  const tokenAddress = quoteData.fromToken.address;
  const blockchain = quoteData.fromToken.blockchain;
  const chain = SUPPORTED_CHAINS[blockchain];
  const approvalAddress =
    swapData?.transaction?.approvalAddress ||
    quoteData.data?.transaction?.approvalAddress;

  if (
    chain?.type !== "EVM" ||
    isNativeTokenAddress(tokenAddress) ||
    !approvalAddress
  ) {
    return {
      approvalRequired: false,
      spenderAddress: approvalAddress || "",
      chainId: chain?.type === "EVM" ? chainIdToHex(chain?.chainId) : "",
    };
  }

  const response = await request("get", "/utility/checkApprove", null, {
    blockchain,
    tokenAddress,
    walletAddress: fromAddress,
    spenderAddress: approvalAddress,
    amount: quoteData.request.srcTokenAmount,
  });

  return {
    approvalRequired: Boolean(response?.needApprove),
    spenderAddress: approvalAddress,
    message: response?.message || "",
    ...normalizeTransaction(response?.transaction, chain),
  };
}

function toEstimate(quoteData) {
  const estimate = quoteData.data?.estimate || {};
  const fromPrice = Number(quoteData.fromToken.usdPrice || quoteData.data?.tokens?.from?.price);
  const fromAmount = Number(quoteData.request.srcTokenAmount);
  const fromUsd =
    Number.isFinite(fromPrice) && Number.isFinite(fromAmount)
      ? fromPrice * fromAmount
      : 0;
  const toUsd = Number(estimate.destinationUsdAmount || 0);

  return {
    provider: "rubic",
    estimatedAmount: stringifyAmount(estimate.destinationTokenAmount),
    amountFrom: String(quoteData.request.srcTokenAmount),
    amountTo: stringifyAmount(estimate.destinationTokenAmount),
    fromUsd,
    toUsd,
    min: null,
    max: null,
    unlimitedMax: true,
    rateId: quoteData.data.id || null,
    rateExpiresAt: null,
    rate: null,
    fee: quoteData.data?.fees?.percentFees?.percent ?? null,
    withdrawalFee: null,
    durationInMinutes: estimate.durationInMinutes ?? null,
    slippage: estimate.slippage ?? SLIPPAGE,
    priceImpact: estimate.priceImpact ?? null,
    routeProvider: quoteData.data?.routing?.[0]?.provider || null,
    swapType: quoteData.data?.swapType || null,
    unavailable: false,
    rubic: {
      quote: quoteData.data,
      request: quoteData.request,
    },
  };
}

function normalizeExchangeRecord({
  id,
  payload,
  quoteData,
  swapData,
  approval,
  existing,
  status,
  depositRouteAttempts,
}) {
  const estimate = quoteData.data?.estimate || {};
  const transaction = swapData?.transaction || {};
  const fromCurrency = tokenToCurrency(quoteData.fromToken);
  const toCurrency = tokenToCurrency(quoteData.toToken);
  const chain = SUPPORTED_CHAINS[quoteData.fromToken.blockchain];
  const providerTx = normalizeTransaction(transaction, chain);
  const depositExtra = normalizeDepositExtraField(transaction.extraFields);
  const isDepositRoute = Boolean(cleanAddress(transaction.depositAddress));
  const now = new Date().toISOString();

  return {
    ...(existing || {}),
    id,
    provider: "rubic",
    status,
    amountFrom: String(payload.amount),
    amountTo: stringifyAmount(estimate.destinationTokenAmount),
    tickerFrom: fromCurrency.ticker,
    networkFrom: fromCurrency.network,
    tickerTo: toCurrency.ticker,
    networkTo: toCurrency.network,
    addressFrom: transaction.depositAddress || providerTx.to || "",
    addressTo: cleanAddress(payload.addressTo),
    depositExtraId: depositExtra.value ?? existing?.depositExtraId ?? null,
    depositExtraName: depositExtra.name ?? existing?.depositExtraName ?? null,
    refundAddress: cleanAddress(
      payload.userRefundAddress || existing?.refundAddress
    ),
    refundExtraId: null,
    createdAt: existing?.createdAt || now,
    completedAt: existing?.completedAt || "",
    rubic: {
      ...(existing?.rubic || {}),
      quoteId: quoteData.data.id,
      providerType: quoteData.data?.providerType || swapData?.providerType || "",
      swapType: quoteData.data?.swapType || swapData?.swapType || "",
      routeProvider:
        quoteData.data?.routing?.[0]?.provider ||
        swapData?.routing?.[0]?.provider ||
        "",
      fromCurrency,
      toCurrency,
      request: quoteData.request,
      quoteRequest: swapData?.quote || null,
      estimate,
      fees: swapData?.fees || quoteData.data?.fees || null,
      route: swapData?.routing || quoteData.data?.routing || [],
      tx:
        !isDepositRoute && (providerTx.to || providerTx.data)
          ? providerTx
          : existing?.rubic?.tx || null,
      approval: approval || existing?.rubic?.approval || null,
      executionType: isDepositRoute ? "deposit" : "wallet",
      needsWallet: !isDepositRoute,
      depositAddress: transaction.depositAddress || "",
      amountToSend: transaction.amountToSend || "",
      exchangeId: transaction.exchangeId || "",
      extraFields: transaction.extraFields || null,
      depositRouteAttempts:
        depositRouteAttempts || existing?.rubic?.depositRouteAttempts || [],
      depositHash: existing?.rubic?.depositHash || "",
      receiveHash: existing?.rubic?.receiveHash || "",
      remoteStatus: existing?.rubic?.remoteStatus || "",
      rawSwap: swapData || null,
    },
  };
}

async function resolveToken(currencyLike) {
  const rubicToken = currencyLike?.rubic || currencyLike;
  const directBlockchain = normalizeBlockchain(
    rubicToken?.blockchain || rubicToken?.blockchainNetwork || rubicToken?.network
  );
  const directAddress = cleanAddress(rubicToken?.address);

  if (directBlockchain && directAddress) {
    return normalizeToken({
      ...rubicToken,
      address: directAddress,
      blockchainNetwork: directBlockchain,
      network: directBlockchain,
      symbol: rubicToken.symbol || currencyLike?.ticker,
      name: rubicToken.name || currencyLike?.name,
    });
  }

  const blockchain = normalizeBlockchain(currencyLike?.network);
  const symbol = String(
    currencyLike?.ticker || currencyLike?.symbol || rubicToken?.symbol || ""
  )
    .trim()
    .toUpperCase();

  if (!blockchain || !symbol) {
    throw createError(400, "Rubic currency and network are required");
  }

  const currencies = await getCurrencies();
  const cached = currencies.find((currency) => {
    return (
      currency.ticker.toUpperCase() === symbol &&
      currency.rubic?.blockchain === blockchain
    );
  });

  if (cached?.rubic) return normalizeToken(cached.rubic);

  const result = await request("get", "/tokens/", null, {
    network: blockchain,
    symbol,
    pageSize: 20,
  });
  const token = (result?.results || [])
    .map(normalizeToken)
    .filter(Boolean)
    .sort(compareTokens)[0];

  if (!token) {
    throw createError(400, `Unsupported Rubic token: ${symbol} on ${blockchain}`);
  }

  return token;
}

function buildQuoteRequest({
  fromToken,
  toToken,
  amount,
  fromAddress,
  receiver,
  depositTradeParams,
  useDepositTradeIfAvailable = false,
}) {
  return compact({
    srcTokenAddress: fromToken.address,
    dstTokenAddress: toToken.address,
    srcTokenBlockchain: fromToken.blockchain,
    dstTokenBlockchain: toToken.blockchain,
    srcTokenAmount: String(amount),
    referrer: REFERRER,
    fromAddress: cleanAddress(fromAddress),
    receiver: cleanAddress(receiver),
    slippage: SLIPPAGE,
    timeout: QUOTE_TIMEOUT_SECONDS,
    showFailedRoutes: false,
    showDangerousRoutes: false,
    depositTradeParams,
    useDepositTradeIfAvailable,
  });
}

function buildSwapRequest({ quoteData, fromAddress, receiver, manualDeposit }) {
  return compact({
    ...quoteData.request,
    id: quoteData.data.id,
    fromAddress,
    receiver,
    preferredProvider: manualDeposit
      ? quoteData.request.preferredProvider || quoteData.data?.providerType
      : undefined,
    enableChecks: !manualDeposit,
  });
}

function toCurrency(token) {
  const normalizedToken = normalizeToken(token);
  if (!normalizedToken) return null;

  const chain = SUPPORTED_CHAINS[normalizedToken.blockchain];
  if (!chain) return null;

  return tokenToCurrency(normalizedToken);
}

function tokenToCurrency(token) {
  const chain = SUPPORTED_CHAINS[token.blockchain];
  const native = isNativeToken(token);

  return {
    ticker: cleanTicker(token.symbol),
    network: chain.network,
    name: token.name || token.symbol,
    image: normalizeImageUrl(token.image) || fallbackTokenImageUrl(token),
    enabled: true,
    isFiat: false,
    isAvailableFixed: false,
    isAvailableFloat: true,
    provider: "rubic",
    rubic: {
      address: token.address,
      blockchain: token.blockchain,
      blockchainId: token.blockchainId || chain.chainId,
      decimals: token.decimals,
      symbol: token.symbol,
      name: token.name,
      image: normalizeImageUrl(token.image) || fallbackTokenImageUrl(token),
      usdPrice: token.usdPrice,
      type: token.type,
      rank: token.rank,
      sourceRank: token.sourceRank,
      native,
    },
  };
}

function normalizeToken(token) {
  const blockchain = normalizeBlockchain(
    token?.blockchainNetwork || token?.blockchain || token?.network
  );
  const chain = SUPPORTED_CHAINS[blockchain];
  const symbol = String(token?.symbol || "").trim().toUpperCase();
  const address = cleanAddress(token?.address || ZERO_ADDRESS);
  const type = String(token?.type || "").trim();
  const native = isNativeTokenAddress(address) || isNativeTokenType(type);

  if (!chain || !symbol || !address) return null;

  return {
    address,
    blockchain,
    blockchainId: Number(token?.blockchainId || chain.chainId),
    decimals: Number(token?.decimals ?? (native ? chain.nativeDecimals : 0)),
    symbol,
    name: String(token?.name || symbol).trim(),
    image:
      normalizeImageUrl(token?.image) ||
      fallbackTokenImageUrl({ blockchain, symbol }),
    type: token?.type || (native ? "NATIVE" : "TOKEN"),
    usdPrice: Number(token?.usdPrice || token?.price || 0),
    rank: Number(token?.rank || 999999),
    sourceRank: Number(token?.source_rank || token?.sourceRank || 999999),
  };
}

function normalizeTransaction(transaction, chain) {
  if (!transaction || typeof transaction !== "object") return {};

  return {
    to: transaction.to || transaction.depositAddress || "",
    data: transaction.data || "",
    value: stringifyAmount(transaction.value || transaction.amountToSend || "0"),
    chainId: chain?.type === "EVM" || !chain?.type ? chainIdToHex(chain?.chainId) : "",
    chainType: chain?.type || "EVM",
    approvalAddress: transaction.approvalAddress || "",
    depositAddress: transaction.depositAddress || "",
    amountToSend: transaction.amountToSend || "",
  };
}

async function request(method, endpoint, payload, params) {
  try {
    const response = await client.request({
      method,
      url: endpoint,
      data: payload || undefined,
      params: params || undefined,
    });

    return response.data;
  } catch (error) {
    if (error.status) throw error;

    const providerBody = error?.response?.data;
    const providerMessage =
      providerBody?.message ||
      providerBody?.error ||
      providerBody?.errors?.[0]?.message ||
      (Array.isArray(providerBody?.errors)
        ? providerBody.errors.map((entry) => entry?.message).filter(Boolean).join("; ")
        : "") ||
      (typeof providerBody === "string" ? providerBody : "");
    const status = error?.response?.status || 502;

    throw createError(
      providerStatusToHttpStatus(status),
      providerMessage || error.message || "Rubic request failed",
      {
        code: providerBody?.code,
        details: providerBody,
        retryable: status === 429 || status >= 500,
      }
    );
  }
}

function normalizeBlockchain(value) {
  const key = String(value || "").trim().toLowerCase();
  return CHAIN_ALIASES[key] || "";
}

function compareCurrencies(a, b) {
  return compareTokens(a.rubic, b.rubic);
}

function compareTokens(a, b) {
  const rankA = Number(a?.rank || 999999);
  const rankB = Number(b?.rank || 999999);
  if (rankA !== rankB) return rankA - rankB;

  const sourceA = Number(a?.sourceRank || a?.source_rank || 999999);
  const sourceB = Number(b?.sourceRank || b?.source_rank || 999999);
  if (sourceA !== sourceB) return sourceA - sourceB;

  const nativeA = isNativeToken(a) ? 0 : 1;
  const nativeB = isNativeToken(b) ? 0 : 1;
  if (nativeA !== nativeB) return nativeA - nativeB;

  return String(a?.symbol || "").localeCompare(String(b?.symbol || ""));
}

function getDepositQuoteCandidates(quoteData) {
  const routes = rankDepositRoutes([
    quoteData.data,
    ...(Array.isArray(quoteData.depositRoutes) ? quoteData.depositRoutes : []),
  ]);
  const seen = new Set();

  return routes.reduce((candidates, route) => {
    const routeId = cleanAddress(route?.id);
    if (!routeId || seen.has(routeId)) return candidates;

    seen.add(routeId);
    candidates.push({
      ...quoteData,
      data: route,
      request: {
        ...quoteData.request,
        preferredProvider:
          route.providerType || getRouteProvider(route) || quoteData.request.preferredProvider,
      },
    });
    return candidates;
  }, []);
}

function rankDepositRoutes(routes) {
  if (!Array.isArray(routes) || !routes.length) return [];

  return routes
    .filter((route) => route?.id && route?.estimate)
    .map((route, index) => ({
      route,
      index,
      priority: getDepositProviderPriority(getRouteProvider(route)),
      output: Number(route?.estimate?.destinationTokenAmount || 0),
    }))
    .sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      if (Number.isFinite(a.output) && Number.isFinite(b.output)) {
        return b.output - a.output;
      }
      return a.index - b.index;
    })
    .map((entry) => entry.route);
}

function getRouteProvider(route) {
  return cleanAddress(
    route?.providerType ||
      route?.routing?.[0]?.provider ||
      route?.route?.[0]?.provider ||
      route?.swapType
  ).toLowerCase();
}

function getDepositProviderPriority(providerType) {
  const index = DEPOSIT_PROVIDER_PRIORITY.indexOf(
    String(providerType || "").toLowerCase()
  );

  return index === -1 ? 999 : index;
}

function normalizeDepositExtraField(extraFields) {
  if (!extraFields) return {};

  if (Array.isArray(extraFields)) {
    return normalizeDepositExtraField(extraFields[0]);
  }

  if (typeof extraFields !== "object") return {};

  return {
    name: cleanAddress(
      extraFields.name ||
        extraFields.label ||
        extraFields.key ||
        extraFields.fieldName
    ),
    value: cleanAddress(
      extraFields.value ||
        extraFields.memo ||
        extraFields.tag ||
        extraFields.extraId
    ),
  };
}

function uniqueByCurrencyKey(currencies) {
  const seen = new Set();
  const unique = [];

  currencies.forEach((currency) => {
    const key = currencyKey(currency);
    if (seen.has(key)) return;

    seen.add(key);
    unique.push(currency);
  });

  return unique;
}

function isNativeTokenAddress(address) {
  return cleanAddress(address).toLowerCase() === ZERO_ADDRESS;
}

function isNativeToken(token) {
  return (
    isNativeTokenAddress(token?.address) ||
    isNativeTokenType(token?.type)
  );
}

function isNativeTokenType(type) {
  return String(type || "").toUpperCase().includes("NATIVE");
}

function createExchangeId() {
  return `rubic_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
}

function validateAmount(value) {
  const raw = String(value ?? "").trim();

  if (!isValidAmount(raw) || Number(raw) <= 0) {
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
  return String(value || "").trim().replace(/^http:\/\//i, "https://");
}

function fallbackTokenImageUrl(token) {
  return KNOWN_TOKEN_IMAGES[`${token?.blockchain}:${token?.symbol}`] || "";
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

function compact(value) {
  return Object.entries(value).reduce((result, [key, entry]) => {
    if (entry !== undefined && entry !== null && entry !== "") {
      result[key] = entry;
    }
    return result;
  }, {});
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
  createExchange,
  confirmExchange,
  getChains,
  getCurrencies,
  getPairMap,
  getRange,
  prepareExchangeTransaction,
  quote,
  refreshExchangeStatus,
  toEstimate,
};
