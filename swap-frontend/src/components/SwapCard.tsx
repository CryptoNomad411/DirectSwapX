import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertCircle,
  ArrowRight,
  ArrowUpDown,
  Check,
  ShieldCheck,
} from "lucide-react";

import CurrencySelect from "../components/CurrencySelect";
import DepositRangeInfo from "../components/DepositRangeInfo";
import { useCurrencies } from "../hooks/useCurrencies";
import { useEstimate } from "../hooks/useEstimate";
import { useRanges } from "../hooks/useRanges";
import { usePairs } from "../hooks/usePairs";
import type { SwapMode } from "../api/client";

import {
  getCompatibleFromCurrencies,
  getCompatibleToCurrencies,
  getDepositRangeLimits,
  isSameCurrency,
  isCompatiblePair,
  isPositiveAmount,
  normalizeAmount,
  validateSendRange,
} from "../utils/PairLogic";

import { Currency } from "../types";

const FALLBACK_FROM: Currency = {
  ticker: "eth",
  network: "eth",
  name: "Ethereum",
  image: "",
  enabled: true,
  isFiat: false,
  isAvailableFixed: true,
  isAvailableFloat: true,
};

const FALLBACK_TO: Currency = {
  ticker: "btc",
  network: "btc",
  name: "Bitcoin",
  image: "",
  enabled: true,
  isFiat: false,
  isAvailableFixed: true,
  isAvailableFloat: true,
};

const FALLBACK_DEX_FROM: Currency = {
  ticker: "eth",
  network: "eth",
  name: "Ethereum",
  image: "",
  enabled: true,
  isFiat: false,
  isAvailableFixed: false,
  isAvailableFloat: true,
};

const FALLBACK_DEX_TO: Currency = {
  ticker: "usdc",
  network: "polygon",
  name: "USD Coin",
  image: "",
  enabled: true,
  isFiat: false,
  isAvailableFixed: false,
  isAvailableFloat: true,
};

export default function SwapCard() {
  const navigate = useNavigate();
  const [swapMode, setSwapMode] = useState<SwapMode>("cex");
  const isDexMode = swapMode === "dex";
  const { currencies, loading: loadingCurrencies } = useCurrencies(swapMode);

  const [from, setFrom] = useState<Currency | null>(FALLBACK_FROM);
  const [to, setTo] = useState<Currency | null>(FALLBACK_TO);
  const [sendAmount, setSendAmount] = useState("");
  const [receiveAmount, setReceiveAmount] = useState("");
  const [activeField, setActiveField] = useState<"send" | "receive">("send");
  const [isFixedRate, setIsFixedRate] = useState(false);
  const [formError, setFormError] = useState("");

  const { pairMap, loadingPairs, pairsError } = usePairs(isFixedRate, swapMode);
  const hasPairMap = Object.keys(pairMap).length > 0;
  const marketLoading = loadingCurrencies || loadingPairs;

  const enabledCurrencies = useMemo(() => {
    return currencies.filter((currency) => currency.enabled !== false);
  }, [currencies]);

  const activeFrom = useMemo(() => {
    return from ? findCurrency(enabledCurrencies, from) || from : null;
  }, [enabledCurrencies, from]);

  const selectedTo = useMemo(() => {
    return to ? findCurrency(enabledCurrencies, to) || to : null;
  }, [enabledCurrencies, to]);

  const toCurrencies = useMemo(() => {
    if (!hasPairMap) {
      return enabledCurrencies.filter((currency) => !isSameCurrency(currency, activeFrom));
    }

    return getCompatibleToCurrencies({ currencies, from: activeFrom, pairMap });
  }, [currencies, enabledCurrencies, hasPairMap, activeFrom, pairMap]);

  const activeTo = useMemo(() => {
    if (
      !hasPairMap ||
      !activeFrom ||
      !selectedTo ||
      isCompatiblePair({ from: activeFrom, to: selectedTo, pairMap })
    ) {
      return selectedTo;
    }

    return toCurrencies[0] || selectedTo;
  }, [activeFrom, selectedTo, hasPairMap, pairMap, toCurrencies]);

  const fromCurrencies = useMemo(() => {
    if (!hasPairMap) return enabledCurrencies;

    return getCompatibleFromCurrencies({ currencies, to: activeTo, pairMap });
  }, [currencies, enabledCurrencies, hasPairMap, activeTo, pairMap]);

  const pairCompatible =
    hasPairMap && isCompatiblePair({ from: activeFrom, to: activeTo, pairMap });
  const selectedAmount = activeField === "send" ? sendAmount : receiveAmount;
  const quoteAmount = isPositiveAmount(selectedAmount) ? selectedAmount : "";
  const quoteReverse = false;

  const { estimate, loading } = useEstimate({
    from: activeFrom,
    to: activeTo,
    amount: quoteAmount,
    fixed: isFixedRate,
    reverse: quoteReverse,
    mode: swapMode,
  });

  const estimateMatchesInput =
    estimate?.requestAmount === quoteAmount &&
    estimate?.requestFixed === isFixedRate &&
    estimate?.requestReverse === quoteReverse &&
    estimate?.requestMode === swapMode;
  const estimatedAmount =
    estimateMatchesInput && estimate?.estimatedAmount
      ? normalizeAmount(estimate.estimatedAmount)
      : "";
  const quoteUnavailable = estimateMatchesInput && Boolean(estimate?.unavailable);
  const displaySendAmount =
    activeField === "receive" ? estimatedAmount || sendAmount : sendAmount;
  const displayReceiveAmount =
    activeField === "send" ? estimatedAmount || receiveAmount : receiveAmount;
  const resolvedSendAmount =
    activeField === "receive" ? estimatedAmount : sendAmount;

  const range = useRanges({
    from: activeFrom,
    to: activeTo,
    fixed: isFixedRate,
    reverse: false,
    mode: swapMode,
  });
  const depositRanges = useMemo(() => {
    return getDepositRangeLimits(range.ranges, estimate);
  }, [range.ranges, estimate]);
  const rangeValidation = validateSendRange({
    sendAmount: resolvedSendAmount,
    min: depositRanges?.min,
    max: depositRanges?.max,
  });
  const hasValidAmount = isPositiveAmount(selectedAmount);
  const hasQuote = Boolean(estimatedAmount) && !quoteUnavailable;

  const canContinue =
    Boolean(activeFrom) &&
    Boolean(activeTo) &&
    hasPairMap &&
    pairCompatible &&
    hasValidAmount &&
    hasQuote &&
    rangeValidation.valid &&
    !quoteUnavailable &&
    !marketLoading &&
    !loading;

  const fromUsdDisplay = formatUsdAmount(estimateMatchesInput ? estimate?.fromUsd : null);
  const toUsdDisplay = formatUsdAmount(estimateMatchesInput ? estimate?.toUsd : null);
  const usdLoading = loading && hasValidAmount;
  const primaryButtonLabel = getPrimaryButtonLabel({
    marketLoading,
    hasPairMap,
    hasPairError: Boolean(pairsError),
    hasCurrencies: enabledCurrencies.length > 0,
    hasPair: Boolean(activeFrom && activeTo),
    pairCompatible,
    hasValidAmount,
    hasQuote,
    rangeValid: rangeValidation.valid,
    estimateUnavailable: quoteUnavailable,
    quoteLoading: loading,
  });

  function handleSendAmountChange(value: string) {
    const nextAmount = sanitizeAmountInput(value);
    if (nextAmount === null) return;

    setFormError("");
    setActiveField("send");
    setSendAmount(nextAmount);
    setReceiveAmount("");
  }

  function handleReceiveAmountChange(value: string) {
    void value;
  }

  function handleSwap() {
    if (!activeFrom || !activeTo) return;
    const prevFrom = activeFrom;
    const prevTo = activeTo;
    const prevSend = resolvedSendAmount;
    const prevReceive = displayReceiveAmount;

    setFrom(prevTo);
    setTo(prevFrom);
    setActiveField("send");
    setSendAmount(prevReceive || prevSend);
    setReceiveAmount("");
    setFormError("");
  }

  function setRateMode(nextFixed: boolean) {
    if (isDexMode || loadingPairs || nextFixed === isFixedRate) return;

    setFormError("");
    setIsFixedRate(nextFixed);
    setActiveField("send");
    setReceiveAmount("");
  }

  function setProviderMode(nextMode: SwapMode) {
    if (nextMode === swapMode || marketLoading) return;

    setFormError("");
    setSwapMode(nextMode);
    setIsFixedRate(false);
    setActiveField("send");
    setSendAmount("");
    setReceiveAmount("");
    setFrom(nextMode === "dex" ? FALLBACK_DEX_FROM : FALLBACK_FROM);
    setTo(nextMode === "dex" ? FALLBACK_DEX_TO : FALLBACK_TO);
  }

  function handleNavigate() {
    setFormError("");
    if (!activeFrom || !activeTo) {
      setFormError("Please select both currencies.");
      return;
    }
    if (!pairCompatible) {
      setFormError(
        isDexMode
          ? "This pair is not available for Baltex DeFi."
          : "This pair is not available for the selected rate mode."
      );
      return;
    }
    if (!hasValidAmount) {
      setFormError("Please enter a valid amount.");
      return;
    }
    if (!rangeValidation.valid) {
      setFormError(`${rangeValidation.reason} ${activeFrom.ticker.toUpperCase()}.`);
      return;
    }
    if (quoteUnavailable) {
      setFormError(estimate?.message || "This quote is unavailable.");
      return;
    }

    navigate(
      `/swap/${activeFrom.ticker}/${activeFrom.network}/${activeTo.ticker}/${activeTo.network}/${resolvedSendAmount}/${isFixedRate}?mode=${swapMode}`
    );
  }

  return (
    <div className="w-full max-w-[700px] rounded-[18px] border border-white/10 bg-[#090F22] p-5 shadow-[0_32px_110px_rgba(0,0,0,0.42)] backdrop-blur-xl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-[25px] font-black leading-none text-white">
            Swap crypto
          </h2>
          <p className="mt-2 text-[13px] font-medium text-[#7F8AA6]">
            Live quote. You keep custody.
          </p>
        </div>

        <div className="flex w-full flex-col gap-2 sm:w-auto sm:items-end">
          <div className="flex h-[38px] w-full rounded-[10px] border border-white/10 bg-[#0E1530] p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] sm:w-auto">
            <RateButton
              active={swapMode === "cex"}
              disabled={marketLoading}
              label="CEX"
              title="Use Baltex for the exchange route."
              onClick={() => setProviderMode("cex")}
            />
            <RateButton
              active={isDexMode}
              disabled={marketLoading}
              label="DEX"
              title="Use Baltex DeFi for the DEX route."
              onClick={() => setProviderMode("dex")}
            />
          </div>

          {isDexMode ? (
            <div className="flex h-[34px] items-center rounded-[9px] border border-cyan-300/20 bg-cyan-400/10 px-4 text-[13px] font-bold text-cyan-100">
              Baltex DeFi route
            </div>
          ) : (
            <div className="flex h-[38px] w-full rounded-[10px] border border-white/10 bg-[#0E1530] p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] sm:w-auto">
              <RateButton
                active={isFixedRate}
                disabled={loadingPairs}
                label="Fixed"
                title="Use fixed-rate mode when creating the swap."
                onClick={() => setRateMode(true)}
              />
              <RateButton
                active={!isFixedRate}
                disabled={loadingPairs}
                label="Float"
                title="Use the market rate available when the swap executes."
                onClick={() => setRateMode(false)}
              />
            </div>
          )}
        </div>
      </div>

      <div className="mt-5">
        <SwapField
          label="You pay"
          loading={loading && activeField === "receive"}
          amount={displaySendAmount}
          onAmountChange={handleSendAmountChange}
          readOnly={false}
          usdText={fromUsdDisplay}
          usdLoading={usdLoading}
          placeholder="0.0"
          currencySelect={
            <CurrencySelect
              value={activeFrom}
              currencies={fromCurrencies}
              compact
              loading={marketLoading}
              showNetwork
              onChange={(value) => {
                setFormError("");
                setFrom(value);
                setActiveField("send");
                setReceiveAmount("");
              }}
            />
          }
        />

        <div className="flex h-[56px] items-center justify-center">
          <button
            type="button"
            onClick={handleSwap}
            disabled={!activeFrom || !activeTo}
            className="flex h-11 w-11 items-center justify-center rounded-[12px] border border-[#7B5CFF]/70 bg-[#121936] text-[#A889FF] shadow-[0_0_30px_rgba(124,92,255,0.26)] transition hover:border-[#9D85FF] hover:text-white active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
            title="Swap currencies"
          >
            <ArrowUpDown size={22} />
          </button>
        </div>

        <SwapField
          label="You receive"
          loading={loading && activeField === "send"}
          amount={displayReceiveAmount}
          onAmountChange={handleReceiveAmountChange}
          readOnly
          usdText={toUsdDisplay}
          usdLoading={usdLoading}
          muted
          placeholder="0.0"
          currencySelect={
            <CurrencySelect
              value={activeTo}
              currencies={toCurrencies}
              compact
              loading={marketLoading}
              showNetwork
              onChange={(value) => {
                setFormError("");
                setTo(value);
                setActiveField("send");
                setReceiveAmount("");
              }}
            />
          }
        />
      </div>

      {pairsError && <InlineAlert tone="danger">{pairsError}</InlineAlert>}

      {activeFrom && activeTo && hasPairMap && !pairCompatible && !loadingPairs && (
        <InlineAlert tone="danger">
          {isDexMode
            ? "This pair is not available for Baltex DeFi."
            : `This pair is not available for ${isFixedRate ? "fixed" : "floating"} rate.`}
        </InlineAlert>
      )}

      {depositRanges && (
        <DepositRangeInfo
          ranges={depositRanges}
          ticker={activeFrom?.ticker}
          className="mt-3"
        />
      )}

      {quoteUnavailable && (
        <InlineAlert tone="danger">{estimate?.message}</InlineAlert>
      )}

      {!rangeValidation.valid && selectedAmount && (
        <InlineAlert tone="warning">
          {rangeValidation.reason}{" "}
          {activeFrom?.ticker?.toUpperCase() || ""}.
        </InlineAlert>
      )}

      {formError && <InlineAlert tone="danger">{formError}</InlineAlert>}

      <button
        type="button"
        onClick={handleNavigate}
        disabled={!canContinue}
        className="mt-4 flex h-[54px] w-full items-center justify-center gap-3 rounded-[10px] bg-gradient-to-r from-[#7B3FF2] to-[#477CFF] text-[16px] font-bold text-white shadow-[0_18px_42px_rgba(73,104,255,0.25)] transition hover:translate-y-[-1px] hover:shadow-[0_22px_52px_rgba(73,104,255,0.32)] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-55 disabled:hover:translate-y-0 disabled:hover:shadow-[0_18px_42px_rgba(73,104,255,0.25)]"
      >
        {primaryButtonLabel}
        <ArrowRight size={20} />
      </button>

      <div className="mt-4 flex items-center justify-center gap-2 text-[13px] font-medium text-[#8F9AB5]">
        <ShieldCheck size={16} />
        <span>
          {isDexMode
            ? "Baltex DeFi handles the DEX route"
            : "Baltex handles the exchange after deposit"}
        </span>
      </div>
    </div>
  );
}

function SwapField({
  label,
  loading,
  amount,
  onAmountChange,
  readOnly,
  usdText,
  usdLoading,
  placeholder,
  currencySelect,
  muted,
}: {
  label: string;
  loading: boolean;
  amount: string;
  onAmountChange: (value: string) => void;
  readOnly: boolean;
  usdText: string | null;
  usdLoading?: boolean;
  placeholder: string;
  currencySelect: React.ReactNode;
  muted?: boolean;
}) {
  return (
    <div className="grid min-h-[82px] grid-cols-[minmax(0,1fr)_200px] overflow-hidden rounded-[10px] border border-white/10 bg-[#11182D] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] sm:grid-cols-[minmax(0,1fr)_190px]">
      <div className="grid grid-cols-1 gap-2 px-4 py-3 sm:grid-cols-[1fr_150px] sm:items-center sm:gap-4 sm:py-0">
        <label className="text-[14px] font-semibold text-[#B7C3DD]">
          {label}
        </label>

        <div className="min-w-0 text-right">
          {loading ? (
            <AmountSkeleton />
          ) : (
            <input
              value={amount}
              onChange={(event) => onAmountChange(event.target.value)}
              readOnly={readOnly}
              inputMode="decimal"
              placeholder={placeholder}
              aria-label={`${label} amount`}
              className={`w-full bg-transparent text-right text-[19px] font-black leading-none text-white outline-none placeholder:text-[#5F6982] ${
                muted ? "cursor-not-allowed text-[#8792AD]" : ""
              }`}
            />
          )}
          {usdLoading ? (
            <UsdAmountSkeleton />
          ) : usdText ? (
            <p className="mt-1 text-[13px] font-medium text-[#8792AD]">
              {"\u2248"} {usdText}
            </p>
          ) : (
            <p className="mt-1 h-[17px]" aria-hidden="true" />
          )}
        </div>
      </div>

      <div className="border-l border-white/10 bg-white/[0.025]">
        {currencySelect}
      </div>
    </div>
  );
}

function RateButton({
  active,
  disabled,
  label,
  title,
  onClick,
}: {
  active: boolean;
  disabled: boolean;
  label: string;
  title: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`flex h-[30px] min-w-[82px] items-center justify-center gap-2 rounded-[7px] px-4 text-[14px] font-semibold transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 ${
        active
          ? "bg-[#21183F] text-[#C3B4FF] shadow-[inset_0_0_0_1px_rgba(126,82,255,0.35),0_8px_22px_rgba(126,82,255,0.12)]"
          : "text-[#8F9AB5] hover:bg-white/[0.04] hover:text-white"
      }`}
    >
      {active && <Check size={14} />}
      {label}
    </button>
  );
}

function formatUsdAmount(value: unknown) {
  const numericValue =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : Number.NaN;

  if (!Number.isFinite(numericValue) || numericValue <= 0) {
    return null;
  }

  if (numericValue < 0.01) {
    return "< $0.01";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numericValue);
}

function findCurrency(currencies: Currency[], target: Currency) {
  return currencies.find((currency) => isSameCurrency(currency, target));
}

function sanitizeAmountInput(value: string) {
  const normalizedValue = value.replace(",", ".").trim();

  if (normalizedValue === "") return "";
  if (/^\d*\.?\d*$/.test(normalizedValue)) return normalizedValue;

  return null;
}

function getPrimaryButtonLabel({
  marketLoading,
  hasPairMap,
  hasPairError,
  hasCurrencies,
  hasPair,
  pairCompatible,
  hasValidAmount,
  hasQuote,
  rangeValid,
  estimateUnavailable,
  quoteLoading,
}: {
  marketLoading: boolean;
  hasPairMap: boolean;
  hasPairError: boolean;
  hasCurrencies: boolean;
  hasPair: boolean;
  pairCompatible: boolean;
  hasValidAmount: boolean;
  hasQuote: boolean;
  rangeValid: boolean;
  estimateUnavailable: boolean;
  quoteLoading: boolean;
}) {
  if (marketLoading) return "Loading markets";
  if (!hasCurrencies) return "Tokens unavailable";
  if (hasPairError || !hasPairMap) return "Markets unavailable";
  if (!hasPair) return "Select tokens";
  if (!pairCompatible) return "Pair unavailable";
  if (!hasValidAmount) return "Enter amount";
  if (!rangeValid) return "Adjust amount";
  if (estimateUnavailable) return "Quote unavailable";
  if (quoteLoading || !hasQuote) return "Getting quote";

  return "Review swap";
}

function AmountSkeleton() {
  return (
    <div className="flex w-full justify-end">
      <div className="h-[34px] w-[130px] animate-pulse rounded-lg bg-white/10" />
    </div>
  );
}

function UsdAmountSkeleton() {
  return (
    <div className="mt-2 flex w-full justify-end">
      <div className="h-[18px] w-[96px] animate-pulse rounded-md bg-white/10" />
    </div>
  );
}

function InlineAlert({
  tone,
  children,
}: {
  tone: "danger" | "warning" | "info";
  children: React.ReactNode;
}) {
  const styles = {
    danger: "border-red-400/25 bg-red-500/10 text-red-200",
    warning: "border-orange-400/25 bg-orange-500/10 text-orange-200",
    info: "border-blue-400/25 bg-blue-500/10 text-blue-200",
  };

  return (
    <div
      className={`mt-3 flex items-start gap-2 rounded-[8px] border px-4 py-3 text-sm font-semibold ${styles[tone]}`}
    >
      <AlertCircle size={16} className="mt-[2px] shrink-0" />
      <span>{children}</span>
    </div>
  );
}
