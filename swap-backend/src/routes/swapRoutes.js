const express = require("express");
const fs = require("fs/promises");
const path = require("path");

const baltex = require("../providers/baltex");
const baltexDefi = require("../providers/baltexDefi");
const changehero = require("../providers/changehero");
const rabbit = require("../providers/rabbit");
const rubic = require("../providers/rubic");
const exchangeStore = require("../store/exchangeStore");

const router = express.Router();

router.get("/health", (req, res) => {
  res.json({
    success: true,
    data: {
      ok: true,
      providers: ["baltex", "baltex-defi", "changehero"],
    },
  });
});

router.post(
  "/log-user-agent",
  asyncHandler(async (req, res) => {
    const body = req.body || {};
    const userAgent = sanitizeString(body.userAgent || req.get("user-agent"), 700);
    const entry = {
      time: new Date().toISOString(),
      ip: getClientIp(req),
      location: getClientLocation(req, body),
      os: getOperatingSystem(userAgent, body),
      browser: getBrowserInfo(userAgent, req),
    };

    console.info("[visit]", JSON.stringify(entry));
    await appendVisitorLog(entry).catch((error) => {
      console.error("[visit-log-write-failed]", error.message);
    });

    res.json({ success: true, data: { logged: true } });
  })
);

router.get(
  "/currencies",
  asyncHandler(async (req, res) => {
    const provider = resolveProvider(req.query);
    const currencies = await getProviderCurrencies(provider);

    res.json({ success: true, data: currencies });
  })
);

router.get(
  "/pairs",
  asyncHandler(async (req, res) => {
    const provider = resolveProvider(req.query);
    const pairMap = await getProviderPairMap(provider);

    res.json({ success: true, data: pairMap });
  })
);

router.post(
  "/estimate",
  asyncHandler(async (req, res) => {
    const { from, to, amount } = req.body || {};

    if (!from || !to || !amount) {
      throw httpError(400, "from, to, and amount are required");
    }

    const provider = resolveProvider(req.body);

    if (provider === "baltex-defi") {
      const quote = await getBaltexDefiQuoteOrUnavailable({
        from,
        to,
        amount,
      });

      if (quote.unavailable) {
        res.json({ success: true, data: quote });
        return;
      }

      res.json({ success: true, data: baltexDefi.toEstimate(quote) });
      return;
    }

    if (provider === "baltex") {
      const quote = await getBaltexQuoteOrUnavailable({
        from,
        to,
        amount,
        fixed: req.body?.fixed,
      });

      if (quote.unavailable) {
        res.json({ success: true, data: quote });
        return;
      }

      res.json({ success: true, data: baltex.toEstimate(quote) });
      return;
    }

    const quote = await getChangeHeroQuoteOrUnavailable({
      from,
      to,
      amount,
      fixed: req.body?.fixed,
      reverse: req.body?.reverse,
    });

    if (quote.unavailable) {
      res.json({ success: true, data: quote });
      return;
    }

    const data = quote.data || {};
    const quotedAmount = quote.amount || data.amount;
    const estimatedAmount = quotedAmount;
    const amountFrom = req.body?.reverse ? stringifyAmount(quotedAmount) : String(amount);
    const amountTo = req.body?.reverse ? String(amount) : stringifyAmount(quotedAmount);
    const usdValues = await changehero.getUsdValues({
      fromCoin: quote.fromCurrency,
      toCoin: quote.toCurrency,
      fromAmount: amountFrom,
      toAmount: amountTo,
      quote,
    });

    res.json({
      success: true,
      data: {
        provider: "changehero",
        estimatedAmount: stringifyAmount(estimatedAmount),
        amountFrom,
        amountTo,
        fromUsd: usdValues.fromUsd,
        toUsd: usdValues.toUsd,
        min: data.min_amount ?? null,
        max: data.max_amount && Number(data.max_amount) > 0 ? data.max_amount : null,
        unlimitedMax: data.max_amount !== undefined && Number(data.max_amount) === 0,
        rateId: data.rate_uuid || null,
        rateExpiresAt: data.rate_expired_at || data.expired_at || null,
        rate: data.rate ?? null,
        fee: data.fee ?? null,
        withdrawalFee: data.withdrawal_fee ?? null,
        unavailable: false,
        changehero: {
          quote: quote.raw || data,
          request: quote.request,
        },
      },
    });
  })
);

router.post(
  "/ranges",
  asyncHandler(async (req, res) => {
    const { from, to } = req.body || {};

    if (!from || !to) {
      throw httpError(400, "from and to are required");
    }

    const provider = resolveProvider(req.body);

    if (provider === "baltex-defi") {
      const range = await baltexDefi.getRange({
        from,
        to,
        amount: req.body?.amount,
      });

      res.json({
        success: true,
        data: {
          min: range.min,
          max: range.max,
          unlimitedMax: range.unlimitedMax,
        },
      });
      return;
    }

    if (provider === "baltex") {
      const range = await baltex.getRange({
        from,
        to,
        amount: req.body?.amount,
        fixed: req.body?.fixed,
      });

      res.json({
        success: true,
        data: {
          min: range.min,
          max: range.max,
          unlimitedMax: range.unlimitedMax,
        },
      });
      return;
    }

    const range = await changehero.getRange({
      from,
      to,
      amount: req.body?.amount,
      fixed: req.body?.fixed,
      reverse: req.body?.reverse,
    });

    res.json({
      success: true,
      data: {
        min: range.min,
        max: range.max,
        unlimitedMax: range.unlimitedMax,
      },
    });
  })
);

router.post(
  "/exchange/check",
  asyncHandler(async (req, res) => {
    const { from, to, amount } = req.body || {};

    if (!from || !to || !amount) {
      throw httpError(400, "from, to, and amount are required");
    }

    const provider = resolveProvider(req.body);

    if (provider === "baltex-defi") {
      const quote = await getBaltexDefiQuoteOrUnavailable({
        from,
        to,
        amount,
      });

      if (quote.unavailable) {
        res.json({
          success: true,
          data: {
            available: false,
            ...quote,
          },
        });
        return;
      }

      const estimate = baltexDefi.toEstimate(quote);
      res.json({
        success: true,
        data: {
          available: true,
          estimatedAmount: estimate.estimatedAmount,
          min: estimate.min,
          max: estimate.max,
          unlimitedMax: estimate.unlimitedMax,
          rateId: estimate.rateId,
          provider: "baltex-defi",
        },
      });
      return;
    }

    if (provider === "baltex") {
      const quote = await getBaltexQuoteOrUnavailable({
        from,
        to,
        amount,
        fixed: req.body?.fixed,
      });

      if (quote.unavailable) {
        res.json({
          success: true,
          data: {
            available: false,
            ...quote,
          },
        });
        return;
      }

      const estimate = baltex.toEstimate(quote);
      res.json({
        success: true,
        data: {
          available: true,
          estimatedAmount: estimate.estimatedAmount,
          min: estimate.min,
          max: estimate.max,
          unlimitedMax: estimate.unlimitedMax,
          rateId: estimate.rateId,
          provider: "baltex",
        },
      });
      return;
    }

    const quote = await getChangeHeroQuoteOrUnavailable({
      from,
      to,
      amount,
      fixed: req.body?.fixed,
      reverse: req.body?.reverse,
    });

    if (quote.unavailable) {
      res.json({
        success: true,
        data: {
          available: false,
          ...quote,
        },
      });
      return;
    }

    const data = quote.data || {};
    const quotedAmount = quote.amount || data.amount;

    res.json({
      success: true,
      data: {
        available: true,
        estimatedAmount: stringifyAmount(quotedAmount),
        min: data.min_amount ?? null,
        max: data.max_amount && Number(data.max_amount) > 0 ? data.max_amount : null,
        unlimitedMax: data.max_amount !== undefined && Number(data.max_amount) === 0,
        rateId: data.rate_uuid || null,
        provider: "changehero",
      },
    });
  })
);

router.post(
  "/exchange",
  asyncHandler(async (req, res) => {
    const payload = req.body || {};

    if (
      !payload.tickerFrom ||
      !payload.networkFrom ||
      !payload.tickerTo ||
      !payload.networkTo
    ) {
      throw httpError(
        400,
        "tickerFrom, networkFrom, tickerTo, and networkTo are required"
      );
    }

    if (!payload.amount) {
      throw httpError(400, "amount is required");
    }

    if (!String(payload.addressTo || "").trim()) {
      throw httpError(400, "addressTo is required");
    }

    const provider = resolveProvider(payload);

    if (provider === "baltex-defi") {
      const exchange = await baltexDefi.createExchange(payload);
      exchangeStore.saveExchange(exchange);
      res.status(201).json({ success: true, data: exchange });
      return;
    }

    if (provider === "baltex") {
      const exchange = await baltex.createExchange(payload);
      exchangeStore.saveExchange(exchange);
      res.status(201).json({ success: true, data: exchange });
      return;
    }

    const exchange = await changehero.createTransaction(payload);
    exchangeStore.saveExchange(exchange);
    res.status(201).json({ success: true, data: exchange });
  })
);

router.post(
  "/exchange/:id/prepare",
  asyncHandler(async (req, res) => {
    const localExchange = exchangeStore.getExchange(req.params.id);

    if (localExchange?.provider === "rubic") {
      const exchange = await rubic.prepareExchangeTransaction(
        localExchange,
        req.body || {}
      );
      exchangeStore.saveExchange(exchange);
      res.json({ success: true, data: exchange });
      return;
    }

    if (localExchange?.provider === "baltex-defi") {
      const exchange = await baltexDefi.prepareExchangeTransaction(
        localExchange,
        req.body || {}
      );
      exchangeStore.saveExchange(exchange);
      res.json({ success: true, data: exchange });
      return;
    }

    if (localExchange?.provider === "baltex") {
      res.json({ success: true, data: localExchange });
      return;
    }

    if (localExchange?.provider === "changehero") {
      res.json({ success: true, data: localExchange });
      return;
    }

    const exchange = await getCexTransaction(req.params.id);
    res.json({ success: true, data: exchange });
  })
);

router.get(
  "/exchange/:id",
  asyncHandler(async (req, res) => {
    const localExchange = exchangeStore.getExchange(req.params.id);

    if (localExchange) {
      if (localExchange.provider === "rubic") {
        const exchange = await rubic.refreshExchangeStatus(localExchange);
        exchangeStore.saveExchange(exchange);
        res.json({ success: true, data: exchange });
        return;
      }

      if (localExchange.provider === "baltex-defi") {
        const exchange = await baltexDefi.refreshExchangeStatus(localExchange);
        exchangeStore.saveExchange(exchange);
        res.json({ success: true, data: exchange });
        return;
      }

      if (localExchange.provider === "baltex") {
        const exchange = await baltex.refreshExchangeStatus(localExchange);
        exchangeStore.saveExchange(exchange);
        res.json({ success: true, data: exchange });
        return;
      }

      if (localExchange.provider === "changehero") {
        const exchange = await getCexTransaction(localExchange.id);
        const nextExchange = {
          ...exchange,
          createdAt: localExchange.createdAt || exchange.createdAt,
        };
        exchangeStore.saveExchange(nextExchange);
        res.json({ success: true, data: nextExchange });
        return;
      }

      res.json({ success: true, data: localExchange });
      return;
    }

    const exchange = await getCexTransaction(req.params.id);
    res.json({ success: true, data: exchange });
  })
);

router.put(
  "/exchange/confirm",
  asyncHandler(async (req, res) => {
    const id = req.body?.id || req.body?.exchangeId || req.body?.orderId;

    if (!id) {
      throw httpError(400, "id is required");
    }

    const localExchange = exchangeStore.getExchange(id);

    if (localExchange?.provider === "rubic") {
      const exchange = rubic.confirmExchange(localExchange, req.body || {});
      exchangeStore.saveExchange(exchange);
      res.json({ success: true, data: exchange });
      return;
    }

    if (localExchange?.provider === "baltex-defi") {
      const exchange = await baltexDefi.confirmExchange(localExchange, req.body || {});
      exchangeStore.saveExchange(exchange);
      res.json({ success: true, data: exchange });
      return;
    }

    if (localExchange?.provider === "baltex") {
      const exchange = await baltex.refreshExchangeStatus(localExchange);
      exchangeStore.saveExchange(exchange);
      res.json({ success: true, data: exchange });
      return;
    }

    if (localExchange?.provider === "changehero") {
      const exchange = await getCexTransaction(localExchange.id);
      exchangeStore.saveExchange(exchange);
      res.json({ success: true, data: exchange });
      return;
    }

    const exchange = await getCexTransaction(id);
    res.json({ success: true, data: exchange });
  })
);

router.get(
  "/cex/transaction/:id/status",
  asyncHandler(async (req, res) => {
    const status = await changehero.getTransactionStatus(req.params.id);
    res.json({
      success: true,
      data: {
        status,
        mappedStatus: changehero.mapStatus(status),
      },
    });
  })
);

async function getRubicQuoteOrUnavailable(payload) {
  try {
    return await rubic.quote(payload);
  } catch (error) {
    if (error?.status && error.status >= 400 && error.status < 500) {
      return {
        provider: "rubic",
        estimatedAmount: "",
        amountFrom: String(payload.amount || ""),
        amountTo: "",
        fromUsd: 0,
        toUsd: 0,
        min: null,
        max: null,
        unlimitedMax: true,
        rateId: null,
        unavailable: true,
        message: error.message || "No Rubic DEX route is available for this pair.",
      };
    }

    throw error;
  }
}

async function getBaltexQuoteOrUnavailable(payload) {
  try {
    return await baltex.quote(payload);
  } catch (error) {
    if (error?.status && error.status >= 400 && error.status < 500) {
      return {
        provider: "baltex",
        estimatedAmount: "",
        amountFrom: String(payload.amount || ""),
        amountTo: "",
        fromUsd: 0,
        toUsd: 0,
        min: null,
        max: null,
        unlimitedMax: false,
        rateId: null,
        unavailable: true,
        message: error.message || "No Baltex exchange route is available for this pair.",
      };
    }

    throw error;
  }
}

async function getBaltexDefiQuoteOrUnavailable(payload) {
  try {
    return await baltexDefi.quote(payload);
  } catch (error) {
    if (error?.status && error.status >= 400 && error.status < 500) {
      return {
        provider: "baltex-defi",
        estimatedAmount: "",
        amountFrom: String(payload.amount || ""),
        amountTo: "",
        fromUsd: 0,
        toUsd: 0,
        min: null,
        max: null,
        unlimitedMax: true,
        rateId: null,
        unavailable: true,
        message: error.message || "No Baltex DeFi route is available for this pair.",
      };
    }

    throw error;
  }
}

async function getChangeHeroQuoteOrUnavailable(payload) {
  try {
    return await changehero.quote(payload);
  } catch (error) {
    if (
      error?.retryable ||
      error?.status === 502 ||
      error?.status === 503 ||
      error?.status === 504
    ) {
      return {
        provider: "changehero",
        estimatedAmount: "",
        amountFrom: String(payload.amount || ""),
        amountTo: "",
        fromUsd: 0,
        toUsd: 0,
        min: null,
        max: null,
        unlimitedMax: false,
        rateId: null,
        unavailable: true,
        message:
          "ChangeHero is temporarily unavailable. Try again later.",
      };
    }

    throw error;
  }
}

async function getCexTransaction(id) {
  try {
    return await changehero.getTransaction(id);
  } catch (error) {
    if (error?.status === 404 || error?.status === 400) {
      return await rabbit.getTransaction(id);
    }

    throw error;
  }
}

async function getProviderCurrencies(provider) {
  if (provider === "baltex") return await baltex.getCurrencies();
  if (provider === "baltex-defi") return await baltexDefi.getCurrencies();
  if (provider === "rubic") return await rubic.getCurrencies();
  return await changehero.getCurrencies();
}

async function getProviderPairMap(provider) {
  if (provider === "baltex") return await baltex.getPairMap();
  if (provider === "baltex-defi") return await baltexDefi.getPairMap();
  if (provider === "rubic") return await rubic.getPairMap();
  return await changehero.getPairMap();
}

function resolveProvider(source = {}) {
  const value = String(
    source.provider || source.mode || source.swapMode || source.type || ""
  )
    .trim()
    .toLowerCase();

  if (value === "cex" || value === "baltex") return "baltex";
  if (value === "dex" || value === "defi" || value === "baltex-defi") return "baltex-defi";
  if (value === "rubic") return "rubic";
  if (value === "rabbit") return "rabbit";
  return "changehero";
}

function stringifyAmount(value) {
  if (value === null || value === undefined) return "0";
  return String(value);
}

function sanitizeString(value, maxLength = 300) {
  if (value === null || value === undefined) return "";
  return String(value).replace(/[\r\n]+/g, " ").slice(0, maxLength);
}

function getClientIp(req) {
  const forwardedFor = sanitizeString(req.get("x-forwarded-for"), 300);
  const firstForwardedIp = forwardedFor.split(",")[0]?.trim();

  return (
    sanitizeString(req.get("cf-connecting-ip"), 100) ||
    sanitizeString(req.get("x-real-ip"), 100) ||
    sanitizeString(req.get("x-client-ip"), 100) ||
    firstForwardedIp ||
    sanitizeString(req.ip, 100) ||
    "Unknown"
  );
}

function getClientLocation(req, body = {}) {
  const city = decodeHeaderValue(req.get("cf-ipcity") || req.get("x-vercel-ip-city"));
  const region = decodeHeaderValue(
    req.get("cf-region") ||
      req.get("x-vercel-ip-country-region") ||
      req.get("x-region")
  );
  const country = decodeHeaderValue(
    req.get("cf-ipcountry") ||
      req.get("x-vercel-ip-country") ||
      req.get("x-country")
  );
  const location = [city, region, country].filter(Boolean).join(", ");

  return (
    location ||
    sanitizeString(body.system?.timezone || req.get("cf-timezone"), 120) ||
    "Unknown"
  );
}

function getOperatingSystem(userAgent, body = {}) {
  const hintedPlatform = sanitizeString(
    body.system?.userAgentData?.platform || reqHeaderSafePlatform(body),
    100
  ).replace(/^"|"$/g, "");

  if (hintedPlatform) return hintedPlatform;

  if (/windows nt 10/i.test(userAgent)) return "Windows 10/11";
  if (/windows/i.test(userAgent)) return "Windows";
  if (/android/i.test(userAgent)) return "Android";
  if (/(iphone|ipad|ipod)/i.test(userAgent)) return "iOS";
  if (/mac os x/i.test(userAgent)) return "macOS";
  if (/linux/i.test(userAgent)) return "Linux";

  return "Unknown";
}

function reqHeaderSafePlatform(body = {}) {
  return body.system?.platform || "";
}

function getBrowserInfo(userAgent, req) {
  const clientHints = sanitizeString(req.get("sec-ch-ua"), 300);
  const hintedBrowser = parseClientHintBrowser(clientHints);

  if (hintedBrowser) return hintedBrowser;

  const browserPatterns = [
    ["Edge", /Edg\/([\d.]+)/i],
    ["Opera", /OPR\/([\d.]+)/i],
    ["Chrome", /Chrome\/([\d.]+)/i],
    ["Firefox", /Firefox\/([\d.]+)/i],
    ["Safari", /Version\/([\d.]+).*Safari/i],
  ];

  for (const [name, pattern] of browserPatterns) {
    const match = userAgent.match(pattern);
    if (match) return `${name} ${majorVersion(match[1])}`;
  }

  return userAgent || "Unknown";
}

function parseClientHintBrowser(value) {
  if (!value) return "";

  const brands = [...value.matchAll(/"([^"]+)";v="([^"]+)"/g)]
    .map((match) => ({
      name: match[1],
      version: match[2],
    }))
    .filter((brand) => !/not|brand/i.test(brand.name));
  const preferredBrand =
    brands.find((brand) => /edge/i.test(brand.name)) ||
    brands.find((brand) => /chrome/i.test(brand.name)) ||
    brands[0];

  return preferredBrand
    ? `${preferredBrand.name} ${majorVersion(preferredBrand.version)}`
    : "";
}

function majorVersion(value) {
  return String(value || "").split(".")[0] || "";
}

function decodeHeaderValue(value) {
  const sanitized = sanitizeString(value, 120);
  if (!sanitized) return "";

  try {
    return decodeURIComponent(sanitized.replace(/\+/g, " "));
  } catch {
    return sanitized;
  }
}

async function appendVisitorLog(entry) {
  const logPath = path.join(__dirname, "../../data/visitor-logs.jsonl");
  await fs.appendFile(logPath, `${JSON.stringify(entry)}\n`, "utf8");
}

function httpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = router;
