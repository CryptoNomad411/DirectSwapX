import {
  AlertCircle,
  ArrowRight,
  ArrowUpDown,
  Check,
  Loader2,
  Plus,
  QrCode,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";

import { createExchange } from "../api/client";
import type { SwapMode } from "../api/client";
import CurrencySelect from "../components/CurrencySelect";
import DepositRangeInfo from "../components/DepositRangeInfo";
import Footer from "../components/Footer";
import Navbar from "../components/Navbar";
import { useCurrencies } from "../hooks/useCurrencies";
import { useEstimate } from "../hooks/useEstimate";
import { usePairs } from "../hooks/usePairs";
import { useRanges } from "../hooks/useRanges";
import { useWallet } from "../hooks/useWallet";
import type { Currency } from "../types";
import {
  getCompatibleFromCurrencies,
  getCompatibleToCurrencies,
  getDepositRangeLimits,
  isCompatiblePair,
  isPositiveAmount,
  normalizeAmount,
  validateSendRange,
} from "../utils/PairLogic";

const EVM_NETWORKS = new Set([
  "arbitrum",
  "avaxc",
  "avalanche",
  "base",
  "bsc",
  "eth",
  "ethereum",
  "matic",
  "optimism",
  "op",
  "polygon",
]);

export default function SwapPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const swapMode: SwapMode = searchParams.get("mode") === "dex" ? "dex" : "cex";
  const isDexMode = swapMode === "dex";
  const { currencies, loading: loadingCurrencies } = useCurrencies(swapMode);
  const {
    address: connectedWalletAddress,
    connecting: connectingWallet,
    connectWallet,
  } = useWallet();

  const { fromTicker, fromNetwork, toTicker, toNetwork, amountIn, fixedRate } =
    useParams();

  const [from, setFrom] = useState<Currency | null>(null);
  const [to, setTo] = useState<Currency | null>(null);
  const [sendAmount, setSendAmount] = useState("");
  const [receiveAmount, setReceiveAmount] = useState("");
  const [activeField, setActiveField] = useState<"send" | "receive">("send");
  const [walletAddress, setWalletAddress] = useState("");
  const [extraIdTo, setExtraIdTo] = useState("");
  const [refundAddress, setRefundAddress] = useState("");
  const [refundExtraId, setRefundExtraId] = useState("");
  const [isFixedRate, setIsFixedRate] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    const fromCurrency = currencies.find(
      (currency) =>
        currency.ticker === fromTicker && currency.network === fromNetwork
    );
    const toCurrency = currencies.find(
      (currency) => currency.ticker === toTicker && currency.network === toNetwork
    );

    setFrom(fromCurrency || null);
    setTo(toCurrency || null);
  }, [currencies, fromTicker, fromNetwork, toTicker, toNetwork]);

  useEffect(() => {
    setSendAmount(amountIn?.toString() ?? "0.1");
    setActiveField("send");
  }, [amountIn]);

  useEffect(() => {
    setIsFixedRate(fixedRate === "true");
  }, [fixedRate]);

  const routeFixed = isDexMode ? false : isFixedRate;
  const { pairMap, loadingPairs, pairsError } = usePairs(routeFixed, swapMode);
  const marketLoading = loadingCurrencies || loadingPairs;
  const pairCompatible = isCompatiblePair({ from, to, pairMap });

  const fromCurrencies = useMemo(() => {
    return getCompatibleFromCurrencies({ currencies, to, pairMap });
  }, [currencies, to, pairMap]);

  const toCurrencies = useMemo(() => {
    return getCompatibleToCurrencies({ currencies, from, pairMap });
  }, [currencies, from, pairMap]);

  const selectedAmount = activeField === "send" ? sendAmount : receiveAmount;
  const isReverse = false;

  const { estimate, loading } = useEstimate({
    from,
    to,
    amount: selectedAmount,
    fixed: routeFixed,
    reverse: isReverse,
    mode: swapMode,
  });

  useEffect(() => {
    if (!estimate?.estimatedAmount) return;

    if (activeField === "receive") {
      setSendAmount(normalizeAmount(estimate.estimatedAmount));
    } else {
      setReceiveAmount(normalizeAmount(estimate.estimatedAmount));
    }
  }, [estimate, activeField]);

  const range = useRanges({
    from,
    to,
    fixed: routeFixed,
    reverse: false,
    mode: swapMode,
  });
  const depositRanges = useMemo(() => {
    return getDepositRangeLimits(range.ranges, estimate);
  }, [range.ranges, estimate]);
  const rangeValidation = validateSendRange({
    sendAmount,
    min: depositRanges?.min,
    max: depositRanges?.max,
  });

  const canCreateExchange =
    Boolean(from) &&
    Boolean(to) &&
    Boolean(walletAddress.trim()) &&
    isPositiveAmount(selectedAmount) &&
    rangeValidation.valid &&
    pairCompatible &&
    !estimate?.unavailable &&
    !creating &&
    !marketLoading;

  const shortConnectedWalletAddress = connectedWalletAddress
    ? `${connectedWalletAddress.substring(0, 6)}...${connectedWalletAddress.slice(-4)}`
    : "";
  const fromUsdDisplay = formatUsdAmount(estimate?.fromUsd);
  const toUsdDisplay = formatUsdAmount(estimate?.toUsd);
  const usdLoading = loading && isPositiveAmount(selectedAmount);
  const canUseConnectedWalletForRecipient =
    Boolean(to?.network) && EVM_NETWORKS.has(to?.network.toLowerCase() || "");
  const routeLabel = `${from?.ticker?.toUpperCase() || "-"} -> ${
    to?.ticker?.toUpperCase() || "-"
  }`;

  useEffect(() => {
    if (!from || !to || loadingPairs || Object.keys(pairMap).length === 0) {
      return;
    }

    if (isCompatiblePair({ from, to, pairMap })) return;

    const nextTo = getCompatibleToCurrencies({ currencies, from, pairMap })[0];

    if (nextTo) {
      setTo(nextTo);
      setActiveField("send");
      setReceiveAmount("");
      setFormError("");
    }
  }, [from, to, pairMap, loadingPairs, currencies]);

  function handleSendAmountChange(value: string) {
    setFormError("");
    setActiveField("send");
    setSendAmount(value);
  }

  function handleReceiveAmountChange(value: string) {
    void value;
  }

  function handleSwap() {
    if (!from || !to) return;

    const previousFrom = from;
    const previousTo = to;
    const previousSendAmount = sendAmount;
    const previousReceiveAmount = receiveAmount;

    setFrom(previousTo);
    setTo(previousFrom);
    setActiveField("send");
    setSendAmount(previousReceiveAmount || previousSendAmount);
    setReceiveAmount("");
    setFormError("");
  }

  function handleSetRateMode(nextFixed: boolean) {
    if (isDexMode || loadingPairs || nextFixed === isFixedRate) return;

    setFormError("");
    setIsFixedRate(nextFixed);
    setActiveField("send");
    setReceiveAmount("");
  }

  async function handlePasteWalletAddress() {
    setFormError("");

    try {
      const value = await navigator.clipboard.readText();

      if (!value.trim()) {
        setFormError("Clipboard is empty.");
        return;
      }

      setWalletAddress(value.trim());
    } catch {
      setFormError("Unable to read from clipboard. Paste the address manually.");
    }
  }

  async function handleConnectWalletAddress() {
    setFormError("");

    if (!canUseConnectedWalletForRecipient) {
      setFormError(
        "Connected wallets can only autofill EVM recipient addresses. Enter this recipient address manually."
      );
      return;
    }

    if (connectedWalletAddress) {
      setWalletAddress(connectedWalletAddress);
      return;
    }

    try {
      const address = await connectWallet();

      if (!address) {
        setFormError("No wallet address was selected.");
        return;
      }

      setWalletAddress(address);
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : "Could not connect wallet. Please try again."
      );
    }
  }

  async function handleCreateExchange() {
    setFormError("");

    if (!from || !to) {
      setFormError("Select both currencies before creating an exchange.");
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

    if (!isPositiveAmount(selectedAmount)) {
      setFormError("Enter a valid amount.");
      return;
    }

    if (!rangeValidation.valid) {
      setFormError(
        rangeValidation.reason.replace(".", ` ${from.ticker.toUpperCase()}.`)
      );
      return;
    }

    if (!walletAddress.trim()) {
      setFormError("Enter the recipient wallet address.");
      return;
    }

    if (estimate?.unavailable) {
      setFormError("This exchange pair is currently unavailable.");
      return;
    }

    try {
      setCreating(true);

      const res = await createExchange({
        provider: swapMode,
        tickerFrom: from.ticker,
        networkFrom: from.network,
        tickerTo: to.ticker,
        networkTo: to.network,
        amount: isReverse ? receiveAmount : sendAmount,
        fixed: routeFixed,
        reverse: isReverse,
        customFee: null,
        addressTo: walletAddress.trim(),
        extraIdTo: extraIdTo.trim(),
        userRefundAddress: refundAddress.trim(),
        userRefundExtraId: refundExtraId.trim(),
        rateId: estimate?.rateId,
        fromAddress:
          !isDexMode && connectedWalletAddress ? connectedWalletAddress : undefined,
      });

      navigate(`/exchange/${res.id}`);
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : "Could not create the exchange. Please check the details and try again."
      );
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="min-h-screen overflow-hidden bg-[#030817] text-white">
      <Navbar />

      <main className="relative border-b border-white/10">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_78%_24%,rgba(73,93,255,0.16),transparent_42%),radial-gradient(circle_at_22%_30%,rgba(126,82,255,0.09),transparent_36%),linear-gradient(180deg,rgba(3,8,23,0)_0%,rgba(3,8,23,0.92)_100%)]" />
        <div className="pointer-events-none absolute right-[8%] top-[120px] h-[520px] w-[520px] rounded-full bg-[radial-gradient(circle,rgba(126,82,255,0.18),rgba(71,124,255,0.08)_48%,transparent_72%)] blur-[42px]" />

        <section className="relative z-10 mx-auto grid max-w-[1600px] gap-8 px-5 py-8 sm:px-8 lg:grid-cols-[minmax(0,1fr)_390px] lg:px-[90px] lg:py-12">
          <section className="rounded-[18px] border border-white/10 bg-[#090F22]/95 p-5 shadow-[0_32px_110px_rgba(0,0,0,0.42)] backdrop-blur-xl sm:p-6 lg:p-7">
            <div className="flex flex-col gap-5 border-b border-white/[0.07] pb-6 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="inline-flex h-9 items-center gap-2 rounded-[9px] border border-[#7E52FF]/35 bg-[#7E52FF]/10 px-4 text-[13px] font-bold text-[#C7B9FF]">
                  <ShieldCheck size={16} />
                  Wallet-first review
                </p>
                <h1 className="mt-4 text-[32px] font-black leading-tight text-white sm:text-[40px]">
                  Confirm your{" "}
                  <span className="bg-gradient-to-r from-[#9F61FF] to-[#477CFF] bg-clip-text text-transparent">
                    route.
                  </span>
                </h1>
                <p className="mt-3 max-w-[580px] text-[15px] font-medium leading-6 text-[#9AA6BF] sm:text-[16px]">
                  Review the amount, recipient wallet, and route before the
                  swap transaction is created.
                </p>
              </div>

              {isDexMode ? (
                <div className="flex h-[38px] w-full items-center justify-center rounded-[10px] border border-cyan-300/20 bg-cyan-400/10 px-4 text-[13px] font-bold text-cyan-100 sm:w-auto">
                  Baltex DeFi route
                </div>
              ) : (
                <div className="flex h-[38px] w-full rounded-[10px] border border-white/10 bg-[#0E1530] p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] sm:w-auto">
                  <RateModeButton
                    active={isFixedRate}
                    disabled={loadingPairs}
                    label="Fixed"
                    onClick={() => handleSetRateMode(true)}
                  />
                  <RateModeButton
                    active={!isFixedRate}
                    disabled={loadingPairs}
                    label="Float"
                    onClick={() => handleSetRateMode(false)}
                  />
                </div>
              )}
            </div>

            <div className="mt-6 space-y-4">
              <SwapAmountField
                label="You send"
                amount={sendAmount}
                loading={loading && activeField === "receive"}
                onAmountChange={handleSendAmountChange}
                readOnly={false}
                usdText={fromUsdDisplay}
                usdLoading={usdLoading}
                currencySelect={
                  <CurrencySelect
                    value={from}
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

              <div className="flex items-center justify-center">
                <button
                  type="button"
                  onClick={handleSwap}
                  disabled={!from || !to}
                  className="flex h-11 w-11 items-center justify-center rounded-[12px] border border-[#7B5CFF]/70 bg-[#121936] text-[#A889FF] shadow-[0_0_30px_rgba(124,92,255,0.26)] transition hover:border-[#9D85FF] hover:text-white active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                  title="Swap currencies"
                >
                  <ArrowUpDown size={22} />
                </button>
              </div>

              <SwapAmountField
                label="You receive"
                amount={receiveAmount}
                loading={loading && activeField === "send"}
                onAmountChange={handleReceiveAmountChange}
                readOnly
                muted
                usdText={toUsdDisplay}
                usdLoading={usdLoading}
                currencySelect={
                  <CurrencySelect
                    value={to}
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

              {pairsError && <InlineAlert tone="danger">{pairsError}</InlineAlert>}

              {from && to && !pairCompatible && !loadingPairs && (
                <InlineAlert tone="danger">
                  {isDexMode
                    ? "This pair is not available for Baltex DeFi."
                    : `This pair is not available for ${isFixedRate ? "fixed" : "floating"} rate.`}
                </InlineAlert>
              )}

              {depositRanges && (
                <DepositRangeInfo
                  ranges={depositRanges}
                  ticker={from?.ticker}
                />
              )}

              {estimate?.unavailable && (
                <InlineAlert tone="danger">
                  This exchange pair is currently unavailable.
                </InlineAlert>
              )}

              {!rangeValidation.valid && sendAmount && (
                <InlineAlert tone="warning">
                  {rangeValidation.reason.replace(
                    ".",
                    ` ${from?.ticker?.toUpperCase() || ""}.`
                  )}
                </InlineAlert>
              )}

            </div>

            <section className="mt-7 border-t border-white/[0.07] pt-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] border border-[#7E52FF]/30 bg-[#7E52FF]/[0.08] text-[#A47CFF]">
                    <Wallet size={18} />
                  </span>
                  <div>
                    <h2 className="text-[22px] font-black text-white">
                      Recipient wallet
                    </h2>
                    <p className="mt-1 text-[13px] font-medium text-[#8F9AB5]">
                      Funds will be sent directly to this address.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleConnectWalletAddress}
                    disabled={connectingWallet || !canUseConnectedWalletForRecipient}
                    className="flex h-10 items-center justify-center gap-2 rounded-[9px] border border-violet-300/35 bg-gradient-to-r from-[#6D45F5] to-[#4B7CFF] px-4 text-[14px] font-bold text-white shadow-[0_0_28px_rgba(93,93,255,0.2)] transition hover:translate-y-[-1px] hover:border-violet-200/55 active:scale-95 disabled:cursor-not-allowed disabled:opacity-55 disabled:hover:translate-y-0"
                  >
                    <Wallet size={17} />
                    {connectingWallet
                      ? "Connecting..."
                      : shortConnectedWalletAddress
                        ? `Use ${shortConnectedWalletAddress}`
                        : "Use wallet"}
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowAdvanced((previous) => !previous)}
                    className={`flex h-10 w-10 items-center justify-center rounded-[9px] border shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition active:scale-95 ${
                      showAdvanced
                        ? "border-[#7B5CFF]/60 bg-[#21183F] text-[#C3B4FF]"
                        : "border-white/10 bg-white/[0.04] text-[#8F9AB5] hover:border-[#7B5CFF]/35 hover:bg-white/[0.06] hover:text-white"
                    }`}
                    title="Show advanced address fields"
                  >
                    <Plus
                      size={20}
                      className={showAdvanced ? "rotate-45 transition" : "transition"}
                    />
                  </button>
                </div>
              </div>

              <div className="mt-5 flex items-center gap-3 rounded-[12px] border border-white/10 bg-[#11182D] px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] transition focus-within:border-[#7B5CFF]/65 focus-within:shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_0_0_3px_rgba(123,92,255,0.12)]">
                <input
                  value={walletAddress}
                  onChange={(event) => {
                    setFormError("");
                    setWalletAddress(event.target.value);
                  }}
                  placeholder={`The recipient's ${
                    to?.ticker ? to.ticker.toUpperCase() : "wallet"
                  } address`}
                  className="h-10 w-full bg-transparent text-[15px] font-semibold text-white outline-none placeholder:text-[#5F6982]"
                />

                <button
                  type="button"
                  onClick={handlePasteWalletAddress}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[9px] border border-white/10 bg-white/[0.04] text-[#A9B2C9] transition hover:border-[#7B5CFF]/35 hover:bg-white/[0.08] hover:text-white active:scale-95"
                  title="Paste address from clipboard"
                >
                  <QrCode size={21} />
                </button>
              </div>

              {showAdvanced && (
                <div className="mt-4 grid gap-3">
                  <SoftInput
                    value={extraIdTo}
                    onChange={setExtraIdTo}
                    placeholder="Destination tag / memo, if required"
                  />
                  <SoftInput
                    value={refundAddress}
                    onChange={setRefundAddress}
                    placeholder="Refund address, optional"
                  />
                  <SoftInput
                    value={refundExtraId}
                    onChange={setRefundExtraId}
                    placeholder="Refund tag / memo, optional"
                  />
                </div>
              )}

              {formError && (
                <div className="mt-4">
                  <InlineAlert tone="danger">{formError}</InlineAlert>
                </div>
              )}

              <button
                type="button"
                onClick={handleCreateExchange}
                disabled={!canCreateExchange}
                className="mt-6 flex h-[56px] w-full items-center justify-center gap-3 rounded-[10px] bg-gradient-to-r from-[#7B3FF2] to-[#477CFF] text-[17px] font-bold text-white shadow-[0_18px_42px_rgba(73,104,255,0.25)] transition hover:translate-y-[-1px] hover:shadow-[0_22px_52px_rgba(73,104,255,0.32)] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-55 disabled:hover:translate-y-0 disabled:hover:shadow-[0_18px_42px_rgba(73,104,255,0.25)]"
              >
                {creating ? (
                  <Loader2 size={21} className="animate-spin" />
                ) : (
                  <ArrowRight size={21} />
                )}
                {creating ? "Creating..." : "Create exchange"}
              </button>
            </section>
          </section>

          <aside className="space-y-5">
            <Panel>
              <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-[#7FA2E8]">
                Current route
              </p>
              <h2 className="mt-2 text-[26px] font-black leading-tight text-white">
                {routeLabel}
              </h2>
              <p className="mt-2 text-[13px] font-medium leading-5 text-[#8F9AB5]">
                {isDexMode
                  ? "Baltex DeFi prepares the DEX route for this swap."
                  : isFixedRate
                    ? "Baltex fixed mode is used when the swap is created."
                    : "Baltex floating mode updates the receive amount from the live route."}
              </p>

              <div className="mt-5 grid gap-3">
                <SummaryRow
                  label={isDexMode ? "Provider" : "Rate type"}
                  value={isDexMode ? "Baltex DeFi" : isFixedRate ? "Fixed" : "Floating"}
                />
                <SummaryRow
                  label="Send"
                  value={`${sendAmount || "0"} ${
                    from?.ticker?.toUpperCase() || ""
                  }`}
                />
                <SummaryRow
                  label="Receive"
                  value={`${receiveAmount || "0"} ${
                    to?.ticker?.toUpperCase() || ""
                  }`}
                />
              </div>
            </Panel>

            <Panel>
              <div className="mb-5 flex items-center justify-between gap-4">
                <h3 className="text-[18px] font-black text-white">Exchange steps</h3>
                <span className="rounded-full border border-[#7B5CFF]/30 bg-[#7B5CFF]/10 px-3 py-1 text-[12px] font-bold text-[#C7B9FF]">
                  5 steps
                </span>
              </div>

              <div className="space-y-1">
                <StepItem active number="1" title="Review details" text="Confirm pair, amount, and recipient." />
                <StepItem number="2" title={`Send ${from?.ticker?.toUpperCase() || "crypto"}`} text="Send the exact amount to the generated deposit address." />
                <StepItem number="3" title="Confirmations" text="Wait for the source chain to confirm the transaction." />
                <StepItem number="4" title="Exchange" text={`Route ${from?.ticker?.toUpperCase() || "crypto"} into ${to?.ticker?.toUpperCase() || "crypto"}.`} />
                <StepItem number="5" title="Complete" text="The swapped funds arrive in your wallet." />
              </div>
            </Panel>

            <Panel>
              <div className="flex items-start gap-3">
                <div className="mt-1 flex h-9 w-9 items-center justify-center rounded-[9px] border border-[#7E52FF]/30 bg-[#7E52FF]/[0.08] text-[#A47CFF]">
                  <ShieldCheck size={18} />
                </div>
                <div>
                  <h3 className="text-[16px] font-black text-white">
                    Non-custodial flow
                  </h3>
                  <p className="mt-2 text-[13px] font-medium leading-5 text-[#8F9AB5]">
                    DirectSwapX prepares the route. You send funds from your own
                    wallet to the generated deposit address.
                  </p>
                </div>
              </div>
            </Panel>
          </aside>
        </section>
      </main>

      <Footer />
    </div>
  );
}

function SwapAmountField({
  label,
  amount,
  loading,
  onAmountChange,
  readOnly,
  muted,
  usdText,
  usdLoading,
  currencySelect,
}: {
  label: string;
  amount: string;
  loading: boolean;
  onAmountChange: (value: string) => void;
  readOnly: boolean;
  muted?: boolean;
  usdText: string | null;
  usdLoading: boolean;
  currencySelect: React.ReactNode;
}) {
  return (
    <div className="grid overflow-hidden rounded-[12px] border border-white/10 bg-[#11182D] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] lg:grid-cols-[140px_minmax(0,1fr)_244px]">
      <div className="flex items-center px-4 pt-4 lg:pt-0">
        <p className="text-[14px] font-bold text-[#B7C3DD]">{label}</p>
      </div>

      <div className="flex min-h-[86px] flex-col items-end justify-center px-4 py-3">
        {loading ? (
          <AmountSkeleton />
        ) : (
          <input
            value={amount}
            onChange={(event) => onAmountChange(event.target.value)}
            readOnly={readOnly}
            inputMode="decimal"
            placeholder="0.0"
            className={`w-full bg-transparent text-right text-[22px] font-black leading-none text-white outline-none placeholder:text-[#5F6982] ${
              muted ? "cursor-not-allowed text-[#8792AD]" : ""
            }`}
          />
        )}

        {usdLoading ? (
          <UsdAmountSkeleton />
        ) : usdText ? (
          <p className="mt-2 text-[13px] font-medium text-[#8792AD]">
            {"\u2248"} {usdText}
          </p>
        ) : (
          <p className="mt-2 h-[17px]" aria-hidden="true" />
        )}
      </div>

      <div className="min-h-[86px] border-t border-white/10 bg-white/[0.025] lg:border-l lg:border-t-0">
        {currencySelect}
      </div>
    </div>
  );
}

function RateModeButton({
  active,
  disabled,
  label,
  onClick,
}: {
  active: boolean;
  disabled: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
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

function Panel({ children }: { children: React.ReactNode }) {
  return (
    <section className="rounded-[18px] border border-white/10 bg-[#090F22]/88 p-5 shadow-[0_24px_80px_rgba(0,0,0,0.26)] backdrop-blur-xl">
      {children}
    </section>
  );
}

function AmountSkeleton() {
  return (
    <div className="flex w-full justify-end">
      <div className="h-[30px] w-[120px] animate-pulse rounded-lg bg-white/10" />
    </div>
  );
}

function UsdAmountSkeleton() {
  return (
    <div className="mt-2 flex w-full justify-end">
      <div className="h-[18px] w-[86px] animate-pulse rounded-md bg-white/10" />
    </div>
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
      className={`flex items-start gap-2 rounded-[8px] border px-4 py-3 text-sm font-semibold ${styles[tone]}`}
    >
      <AlertCircle size={16} className="mt-[2px] shrink-0" />
      <span>{children}</span>
    </div>
  );
}

function SoftInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <input
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      className="h-12 w-full rounded-[12px] border border-white/10 bg-[#11182D] px-4 text-[15px] font-semibold text-white outline-none transition placeholder:text-[#5F6982] focus:border-[#7B5CFF]/65"
    />
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-[10px] bg-white/[0.035] px-4 py-3">
      <span className="text-[13px] font-semibold text-[#8F9AB5]">{label}</span>
      <span className="text-right text-[14px] font-black text-white">
        {value}
      </span>
    </div>
  );
}

function StepItem({
  active,
  number,
  title,
  text,
}: {
  active?: boolean;
  number: string;
  title: string;
  text: string;
}) {
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div
          className={`flex h-8 w-8 items-center justify-center rounded-full text-[13px] font-black transition ${
            active
              ? "bg-[#21183F] text-[#C3B4FF] shadow-[inset_0_0_0_1px_rgba(126,82,255,0.38)]"
              : "bg-white/[0.05] text-[#8F9AB5]"
          }`}
        >
          {number}
        </div>

        {number !== "5" && <div className="mt-2 h-9 w-px bg-white/10" />}
      </div>

      <div className="pb-2">
        <h4 className="mt-1 text-[15px] font-black text-white">{title}</h4>
        <p className="mt-1 max-w-[300px] text-[13px] font-medium leading-5 text-[#8F9AB5]">
          {text}
        </p>
      </div>
    </div>
  );
}
