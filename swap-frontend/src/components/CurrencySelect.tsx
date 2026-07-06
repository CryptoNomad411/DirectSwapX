// components/CurrencySelect.tsx

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronDown,
  Search,
  Check,
  X,
  Loader2,
} from "lucide-react";

import { Currency } from "../types";

interface Props {
  value: Currency | null;
  currencies: Currency[];
  onChange: (currency: Currency) => void;
  availableTickers?: string[];
  compact?: boolean;
  loading?: boolean;
  showNetwork?: boolean;
}

const norm = (v?: string) => (v || "").toUpperCase();
const clean = (v?: string) => (v || "").toLowerCase();

/* ========================================================= */
/* POPULAR PAIRS */
/* ========================================================= */

const popularPairs: Record<string, number> = {
  BTC_BTC: 1,
  ETH_ETH: 2,

  USDT_TRX: 3,
  USDT_ETH: 4,
  USDT_BSC: 5,

  SOL_SOL: 6,
  XRP_XRP: 7,
  BNB_BSC: 8,
  DOGE_DOGE: 9,
  TRX_TRX: 10,
  ADA_ADA: 11,

  AVAX_AVAXC: 12,
  DOT_DOT: 13,
  MATIC_MATIC: 14,

  LINK_ETH: 15,
  LTC_LTC: 16,
  BCH_BCH: 17,
  XMR_XMR: 18,
  ETC_ETC: 19,
  XLM_XLM: 20,
  ATOM_ATOM: 21,
  UNI_ETH: 22,
};

const networkPriority: Record<string, number> = {
  btc: 1,
  eth: 2,
  ethereum: 2,
  bsc: 3,
  trx: 4,
  tron: 4,
  sol: 5,
  solana: 5,
  ton: 6,
  arbitrum: 7,
  optimism: 8,
  op: 8,
  matic: 9,
  polygon: 9,
  base: 10,
  avaxc: 11,
  avalanche: 11,
  avax: 11,
};

const networkLabels: Record<string, string> = {
  btc: "BTC",
  eth: "ETH",
  ethereum: "ETH",
  bsc: "BSC",
  trx: "TRON",
  tron: "TRON",
  sol: "SOLANA",
  solana: "SOLANA",
  ton: "TON",
  arbitrum: "Arbitrum",
  optimism: "Optimism",
  op: "Optimism",
  matic: "Polygon",
  polygon: "Polygon",
  base: "Base",
  avaxc: "Avalanche",
  avalanche: "Avalanche",
  avax: "Avalanche",
};

const localIconNetworkAliases: Record<string, string[]> = {
  arbitrum: ["arbitrum", "arb"],
  avaxc: ["avaxc", "avax"],
  avalanche: ["avalanche", "avaxc", "avax"],
  eth: ["eth"],
  ethereum: ["eth"],
  matic: ["matic", "polygon"],
  optimism: ["optimism", "op"],
  op: ["optimism", "op"],
  polygon: ["matic", "polygon"],
  sol: ["sol"],
  solana: ["sol"],
  tron: ["trx", "tron"],
  trx: ["trx", "tron"],
};

const knownRemoteIconSources: Record<string, string[]> = {
  sol: [
    "https://api-assets.rubic.exchange/assets/coingecko/solana/so11111111111111111111111111111111111111111/logo.png",
  ],
};

export default function CurrencySelect({
  value,
  currencies,
  onChange,
  availableTickers,
  compact = false,
  loading = false,
  showNetwork = false,
}: Props) {
  const [open, setOpen] = useState(false);
  const [tokenSearch, setTokenSearch] = useState("");
  const [networkFilter, setNetworkFilter] = useState("");

  const modalRef = useRef<HTMLDivElement>(null);

  /* ========================================================= */
  /* CLOSE MODAL */
  /* ========================================================= */

  function closeModal() {
    setOpen(false);
    setTokenSearch("");
    setNetworkFilter("");
  }

  function openModal() {
    setTokenSearch("");
    setNetworkFilter("");
    setOpen(true);
  }

  /* ========================================================= */
  /* CLOSE OUTSIDE */
  /* ========================================================= */

  useEffect(() => {
    if (!open) return;

    const close = (e: MouseEvent) => {
      if (
        modalRef.current &&
        !modalRef.current.contains(e.target as Node)
      ) {
        closeModal();
      }
    };

    document.addEventListener("mousedown", close);

    return () => {
      document.removeEventListener("mousedown", close);
    };
  }, [open]);

  /* ========================================================= */
  /* ESC CLOSE */
  /* ========================================================= */

  useEffect(() => {
    if (!open) return;

    const esc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeModal();
      }
    };

    document.addEventListener("keydown", esc);

    return () => {
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  /* ========================================================= */
  /* LOCK BODY SCROLL */
  /* ========================================================= */

  useEffect(() => {
    if (!open) return;

    const originalOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [open]);

  /* ========================================================= */
  /* FILTER AVAILABLE */
  /* ========================================================= */

  const availableSet = useMemo(() => {
    if (!availableTickers?.length) return null;

    return new Set(
      availableTickers.map((ticker) => ticker.toLowerCase())
    );
  }, [availableTickers]);

  const visibleCurrencies = useMemo(() => {
    const enabledCurrencies = currencies.filter((currency) => {
      return currency.enabled !== false;
    });

    if (!availableSet) {
      return enabledCurrencies;
    }

    return enabledCurrencies.filter((currency) =>
      availableSet.has(currency.ticker.toLowerCase())
    );
  }, [currencies, availableSet]);

  /* ========================================================= */
  /* SEARCH FILTER */
  /* ========================================================= */

  const filtered = useMemo(() => {
    const q = tokenSearch.trim().toLowerCase();
    const networkKey = clean(networkFilter);
    const networkFiltered = networkKey
      ? visibleCurrencies.filter((currency) => clean(currency.network) === networkKey)
      : visibleCurrencies;

    if (!q) return networkFiltered;

    return networkFiltered.filter((currency) => {
      const ticker = currency.ticker?.toLowerCase() || "";

      return ticker.includes(q);
    });
  }, [visibleCurrencies, tokenSearch, networkFilter]);

  const availableNetworks = useMemo(() => {
    const seen = new Set<string>();

    return visibleCurrencies
      .map((currency) => clean(currency.network))
      .filter((network) => {
        if (!network || seen.has(network)) return false;

        seen.add(network);
        return true;
      })
      .sort((a, b) => {
        const rankA = networkPriority[a] ?? 9999;
        const rankB = networkPriority[b] ?? 9999;

        if (rankA !== rankB) return rankA - rankB;
        return getNetworkLabel(a).localeCompare(getNetworkLabel(b));
      });
  }, [visibleCurrencies]);

  /* ========================================================= */
  /* SORT */
  /* ========================================================= */

  const sortedFiltered = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const networkRankA = networkPriority[clean(a.network)] ?? 9999;
      const networkRankB = networkPriority[clean(b.network)] ?? 9999;

      if (networkRankA !== networkRankB) {
        return networkRankA - networkRankB;
      }

      const networkSort = norm(a.network).localeCompare(norm(b.network));

      if (networkSort !== 0) {
        return networkSort;
      }

      const keyA = `${norm(a.ticker)}_${norm(a.network)}`;
      const keyB = `${norm(b.ticker)}_${norm(b.network)}`;

      const rankA = popularPairs[keyA] ?? 9999;
      const rankB = popularPairs[keyB] ?? 9999;

      if (rankA !== rankB) {
        return rankA - rankB;
      }

      const tickerSort = norm(a.ticker).localeCompare(norm(b.ticker));

      if (tickerSort !== 0) {
        return tickerSort;
      }

      return norm(a.network).localeCompare(norm(b.network));
    });
  }, [filtered]);

  /* ========================================================= */

  return (
    <>
      {/* BUTTON */}
      <button
        type="button"
        onClick={openModal}
        className={`flex w-full min-w-0 items-center justify-between text-left transition focus:outline-none ${
          compact
            ? "h-full min-h-[82px] gap-3 bg-transparent px-3 hover:bg-white/[0.04] focus-visible:bg-white/[0.06] sm:px-4"
            : "h-[52px] min-h-[52px] gap-3 rounded-[8px] bg-[#090E20] px-3 hover:bg-[#111735] focus-visible:bg-[#111735]"
        }`}
      >
        {value ? (
          <div className={`flex min-w-0 items-center ${compact ? "gap-2" : "gap-3"}`}>
            <CurrencyIcon currency={value} size={compact ? "md" : "lg"} />

            <div className="min-w-0 text-left">
              <div className="flex min-w-0 items-center gap-2">
                <span
                  className={`truncate font-bold ${
                    compact ? "text-[16px] text-white" : "text-[18px] text-white"
                  }`}
                >
                  {value.ticker.toUpperCase()}
                </span>

                {shouldShowNetwork(value, showNetwork) && (
                  <NetworkBadge network={value.network} />
                )}
              </div>

              {!compact && (
                <p className="mt-0.5 truncate text-[12px] font-semibold text-[#8F9AB5]">
                  {value.name}
                </p>
              )}
            </div>
          </div>
        ) : (
          <span className={`text-[15px] font-semibold ${compact ? "text-[#9CA7C1]" : "text-[#8F9AB5]"}`}>
            {loading ? "Loading coins" : "Select currency"}
          </span>
        )}

        {loading ? (
          <Loader2
            size={18}
            className={`shrink-0 animate-spin ${compact ? "text-[#A889FF]" : "text-[#8F9AB5]"}`}
          />
        ) : (
          <ChevronDown
            size={18}
            className={`
              shrink-0 ${compact ? "text-[#9CA7C1]" : "text-[#8F9AB5]"}
              transition
              ${open ? "rotate-180" : ""}
            `}
          />
        )}
      </button>

      {/* ========================================================= */}
      {/* MODAL */}
      {/* ========================================================= */}

      {open && (
        <div
          className="
            fixed inset-0 z-[100]
            flex items-end justify-center
            bg-[#030817]/80 p-0 backdrop-blur-md
            sm:items-center sm:p-6
          "
          role="dialog"
          aria-modal="true"
        >
          <div
            ref={modalRef}
            className="
              flex h-[88dvh]
              w-full
              flex-col overflow-hidden
              rounded-t-[18px]
              border border-white/10
              bg-[#090F22]
              shadow-[0_30px_90px_rgba(0,0,0,0.45)]
              sm:h-[min(720px,calc(100dvh-56px))]
              sm:w-[min(640px,calc(100vw-48px))]
              sm:rounded-[18px]
            "
          >
            <div className="flex shrink-0 items-center justify-between gap-4 border-b border-white/10 px-4 py-4 sm:px-6 sm:py-5">
              <div className="min-w-0">
                <h2 className="truncate text-[21px] font-black leading-tight text-white sm:text-[22px]">
                  Select currency
                </h2>

                <p className="mt-1 text-[13px] font-semibold text-[#8F9AB5] sm:text-[14px]">
                  {loading
                    ? "Preparing available coins"
                    : "Search and choose a currency"}
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                className="
                  flex h-10 w-10 shrink-0
                  items-center justify-center
                  rounded-[8px] border border-white/10
                  text-[#8F9AB5]
                  transition
                  hover:bg-white/[0.06]
                  active:scale-95
                "
                aria-label="Close currency selector"
              >
                <X size={18} />
              </button>
            </div>

            <section className="grid min-h-0 min-w-0 flex-1 grid-rows-[auto_minmax(0,1fr)] sm:grid-cols-[190px_minmax(0,1fr)] sm:grid-rows-1">
              <NetworkFilter
                loading={loading}
                networks={availableNetworks}
                value={networkFilter}
                onChange={setNetworkFilter}
              />

              <div className="flex min-h-0 min-w-0 flex-col border-t border-white/10 sm:border-l sm:border-t-0">
                <div className="border-b border-white/10 p-4 sm:p-5">
                  <div className="flex items-center justify-between gap-4">
                    <p className="text-[13px] font-bold text-[#8F9AB5]">
                      {loading
                        ? "Loading supported assets"
                        : `${sortedFiltered.length} currencies available`}
                    </p>

                    {value && (
                      <div className="hidden items-center gap-3 rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 sm:flex">
                        <CurrencyIcon currency={value} size="sm" />
                        <div className="min-w-0">
                          <p className="truncate text-[13px] font-black text-white">
                            {value.ticker.toUpperCase()}
                          </p>
                          <p className="truncate text-[11px] font-bold uppercase text-[#8F9AB5]">
                            {shouldShowNetwork(value, showNetwork)
                              ? getNetworkLabel(value.network)
                              : value.name}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  <SearchInput
                    autoFocus
                    value={tokenSearch}
                    onChange={setTokenSearch}
                    placeholder="Search ticker"
                    className="mt-4"
                    disabled={loading}
                  />
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto [scrollbar-color:rgba(126,82,255,0.5)_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/15 [&::-webkit-scrollbar-track]:bg-transparent hover:[&::-webkit-scrollbar-thumb]:bg-violet-400/45">
                  {loading ? (
                    <CurrencyLoadingState />
                  ) : (
                    sortedFiltered.map((currency) => (
                      <CurrencyRow
                        key={`${currency.ticker}-${currency.network}`}
                        currency={currency}
                        showNetwork={showNetwork}
                        selected={
                          value?.ticker === currency.ticker &&
                          value?.network === currency.network
                        }
                        onClick={() => {
                          onChange(currency);
                          closeModal();
                        }}
                      />
                    ))
                  )}

                  {!loading && !sortedFiltered.length && (
                    <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
                      <div className="rounded-full bg-white/[0.06] p-4">
                        <Search
                          size={26}
                          className="text-[#8F9AB5]"
                        />
                      </div>

                      <h3 className="mt-5 text-[20px] font-bold text-white">
                        No currencies found
                      </h3>

                      <p className="mt-2 text-[15px] font-semibold text-[#8F9AB5]">
                        Try another search keyword
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </section>
          </div>
        </div>
      )}
    </>
  );
}

function SearchInput({
  value,
  onChange,
  placeholder,
  autoFocus,
  className = "",
  disabled = false,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  autoFocus?: boolean;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <div
      className={`flex h-11 min-w-0 items-center gap-3 rounded-full border border-white/10 bg-white/[0.04] px-4 transition focus-within:border-violet-400/70 focus-within:bg-white/[0.07] sm:h-[46px] ${
        disabled ? "opacity-65" : ""
      } ${className}`}
    >
      <Search size={17} className="shrink-0 text-[#8F9AB5]" />
      <input
        autoFocus={autoFocus}
        disabled={disabled}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full bg-transparent text-[14px] font-semibold text-white outline-none placeholder:text-[#59627A] disabled:cursor-wait"
      />
    </div>
  );
}

function NetworkFilter({
  loading,
  networks,
  value,
  onChange,
}: {
  loading: boolean;
  networks: string[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <aside className="min-h-0 bg-white/[0.018] p-4 sm:p-5">
      <p className="text-[12px] font-black uppercase tracking-[0.14em] text-[#7FA2E8]">
        Networks
      </p>

      <div className="mt-3 flex gap-2 overflow-x-auto pb-1 sm:max-h-full sm:flex-col sm:overflow-y-auto sm:overflow-x-hidden sm:pb-0 [scrollbar-color:rgba(126,82,255,0.5)_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/15 [&::-webkit-scrollbar-track]:bg-transparent">
        <NetworkFilterButton
          active={!value}
          label={loading ? "Loading" : "All networks"}
          count={loading ? undefined : networks.length}
          disabled={loading}
          onClick={() => onChange("")}
        />

        {networks.map((network) => (
          <NetworkFilterButton
            key={network}
            active={clean(value) === network}
            label={getNetworkLabel(network)}
            onClick={() => onChange(network)}
          />
        ))}
      </div>
    </aside>
  );
}

function NetworkFilterButton({
  active,
  count,
  disabled = false,
  label,
  onClick,
}: {
  active: boolean;
  count?: number;
  disabled?: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex h-10 shrink-0 items-center justify-between gap-3 rounded-[10px] border px-3 text-left text-[12px] font-bold transition active:scale-95 disabled:cursor-wait disabled:opacity-65 sm:w-full ${
        active
          ? "border-cyan-300/35 bg-cyan-400/12 text-cyan-100"
          : "border-white/10 bg-white/[0.04] text-[#9CA7C1] hover:bg-white/[0.07] hover:text-white"
      }`}
    >
      <span className="truncate">{label}</span>
      {count !== undefined && (
        <span className="rounded-full bg-white/[0.08] px-2 py-0.5 text-[10px] font-black text-white/60">
          {count}
        </span>
      )}
    </button>
  );
}

function CurrencyLoadingState() {
  return (
    <div className="px-4 py-4 sm:px-5">
      <div className="mb-3 flex items-center gap-2 rounded-[10px] border border-[#7E52FF]/20 bg-[#7E52FF]/10 px-4 py-3 text-[13px] font-bold text-[#C7B9FF]">
        <Loader2 size={16} className="shrink-0 animate-spin" />
        Preparing supported coins
      </div>

      <div className="space-y-2">
        {Array.from({ length: 8 }).map((_, index) => (
          <div
            key={index}
            className="flex animate-pulse items-center justify-between gap-4 rounded-[12px] px-1 py-2"
          >
            <div className="flex min-w-0 flex-1 items-center gap-4">
              <div className="h-10 w-10 shrink-0 rounded-full bg-white/[0.08]" />
              <div className="min-w-0 flex-1">
                <div className="h-4 w-24 rounded-full bg-white/[0.09]" />
                <div className="mt-2 h-3 w-40 max-w-full rounded-full bg-white/[0.06]" />
              </div>
            </div>
            <div className="h-6 w-14 shrink-0 rounded-full bg-white/[0.06]" />
          </div>
        ))}
      </div>
    </div>
  );
}

function CurrencyRow({
  currency,
  showNetwork,
  selected,
  onClick,
}: {
  currency: Currency;
  showNetwork?: boolean;
  selected?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        flex w-full items-center justify-between gap-4
        px-4 py-3 text-left
        transition
        active:bg-white/[0.08]
        sm:px-5 sm:py-4

        ${
          selected
            ? "bg-violet-500/12"
            : "hover:bg-white/[0.05]"
        }
      `}
    >
      {/* LEFT */}
      <div className="flex min-w-0 items-center gap-4">
        <CurrencyIcon currency={currency} size="lg" />

        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-2">
            <span className="truncate text-[16px] font-bold text-white sm:text-[18px]">
              {currency.ticker.toUpperCase()}
            </span>

            {shouldShowNetwork(currency, showNetwork) && (
              <NetworkBadge network={currency.network} />
            )}
          </div>

          <p className="mt-1 truncate text-[12px] font-semibold text-[#8F9AB5] sm:text-[14px]">
            {shouldShowNetwork(currency, showNetwork)
              ? `${currency.name} / ${getNetworkLabel(currency.network)}`
              : currency.name}
          </p>
        </div>
      </div>

      {/* RIGHT */}
      {selected && (
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet-500 text-white">
          <Check size={14} />
        </div>
      )}
    </button>
  );
}

/* ========================================================= */
/* ICON */
/* ========================================================= */

function CurrencyIcon({
  currency,
  size = "md",
}: {
  currency: Currency;
  size?: "sm" | "md" | "lg";
}) {
  const [failed, setFailed] = useState(false);
  const [sourceIndex, setSourceIndex] = useState(0);

  const className =
    size === "lg"
      ? "h-10 w-10 text-[13px]"
      : size === "sm"
        ? "h-7 w-7 text-[10px]"
        : "h-8 w-8 text-[11px]";
  const apiIcon =
    currency.image?.trim() ||
    (currency as Currency & { swft?: { logoURI?: string } }).swft?.logoURI?.trim();
  const sources = [
    apiIcon,
    ...getRemoteFallbackIconSources(currency.ticker),
    ...getLocalIconSources(currency),
  ].filter(
    (source, index, list): source is string => {
      return Boolean(source) && list.indexOf(source) === index;
    }
  );

  useEffect(() => {
    setFailed(false);
    setSourceIndex(0);
  }, [currency.image, currency.ticker, currency.network]);

  if (failed || !sources.length) {
    return (
      <div
        className={`
          flex shrink-0 items-center justify-center
          rounded-full bg-gradient-to-br from-violet-500/25 to-blue-500/20
          font-bold uppercase text-violet-200
          ${className}
        `}
      >
        {currency.ticker.slice(0, 2)}
      </div>
    );
  }

  return (
    <img
      src={sources[sourceIndex]}
      alt={`${currency.ticker}-${currency.network}`}
      onError={() => {
        if (sourceIndex < sources.length - 1) {
          setSourceIndex((current) => current + 1);
          return;
        }

        setFailed(true);
      }}
      className={`shrink-0 rounded-full bg-white/10 ring-1 ring-white/10 ${className}`}
    />
  );
}

function getLocalIconSources(currency: Currency) {
  const tickerVariants = getLocalIconTickerVariants(currency.ticker);
  const networkVariants = getLocalIconNetworkVariants(currency.network);

  return tickerVariants.flatMap((ticker) => {
    return networkVariants.map((network) => `/icons/${ticker}-${network}.svg`);
  });
}

function getRemoteFallbackIconSources(ticker?: string) {
  const tickerVariants = getLocalIconTickerVariants(ticker);

  return unique([
    ...tickerVariants.flatMap((tickerValue) => {
      return knownRemoteIconSources[tickerValue] || [];
    }),
    ...tickerVariants.map((tickerValue) => {
      return `https://cdn.jsdelivr.net/npm/cryptocurrency-icons@0.18.1/svg/color/${tickerValue}.svg`;
    }),
  ]);
}

function getLocalIconTickerVariants(ticker?: string) {
  const rawTicker = clean(ticker);
  const baseTicker = rawTicker.replace(/\([^)]*\)$/g, "");

  return unique([baseTicker, rawTicker]);
}

function getLocalIconNetworkVariants(network?: string) {
  const rawNetwork = clean(network);

  return unique([
    rawNetwork,
    ...(localIconNetworkAliases[rawNetwork] || []),
  ]);
}

function unique(values: string[]) {
  return values.filter((value, index, list) => {
    return Boolean(value) && list.indexOf(value) === index;
  });
}

function hasDistinctNetwork(currency?: Currency | null) {
  if (!currency?.network) return false;
  return clean(currency.ticker) !== clean(currency.network);
}

function shouldShowNetwork(currency?: Currency | null, showNetwork = false) {
  if (!currency?.network) return false;
  return showNetwork || hasDistinctNetwork(currency);
}

/* ========================================================= */
/* NETWORK BADGE */
/* ========================================================= */

function NetworkBadge({
  network,
}: {
  network: string;
}) {
  return (
    <span
      className="
        shrink-0 rounded-full
        bg-white/[0.08]
        px-2 py-[2px]
        text-[11px]
        font-bold uppercase
        tracking-wide text-[#B8C1D6]
      "
    >
      {getNetworkLabel(network)}
    </span>
  );
}

function getNetworkLabel(network?: string) {
  const key = clean(network);
  return networkLabels[key] || norm(network);
}
