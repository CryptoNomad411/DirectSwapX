import { Connection, Transaction, VersionedTransaction } from "@solana/web3.js";
import { BrowserProvider, parseEther } from "ethers";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Copy,
  ExternalLink,
  Loader2,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useParams } from "react-router-dom";

import {
  confirmExchange,
  getExchange,
  prepareExchangeTransaction,
} from "../api/client";
import Footer from "../components/Footer";
import Navbar from "../components/Navbar";
import { useWallet } from "../hooks/useWallet";

const NATIVE_EVM_DEPOSIT_NETWORKS: Record<
  string,
  { chainId: string; token: string; explorerTxUrl: string }
> = {
  eth: {
    chainId: "0x1",
    token: "eth",
    explorerTxUrl: "https://etherscan.io/tx/",
  },
  matic: {
    chainId: "0x89",
    token: "matic",
    explorerTxUrl: "https://polygonscan.com/tx/",
  },
  polygon: {
    chainId: "0x89",
    token: "matic",
    explorerTxUrl: "https://polygonscan.com/tx/",
  },
  bsc: {
    chainId: "0x38",
    token: "bnb",
    explorerTxUrl: "https://bscscan.com/tx/",
  },
  arbitrum: {
    chainId: "0xa4b1",
    token: "eth",
    explorerTxUrl: "https://arbiscan.io/tx/",
  },
  optimism: {
    chainId: "0xa",
    token: "eth",
    explorerTxUrl: "https://optimistic.etherscan.io/tx/",
  },
  op: {
    chainId: "0xa",
    token: "eth",
    explorerTxUrl: "https://optimistic.etherscan.io/tx/",
  },
  base: {
    chainId: "0x2105",
    token: "eth",
    explorerTxUrl: "https://basescan.org/tx/",
  },
  avalanche: {
    chainId: "0xa86a",
    token: "avax",
    explorerTxUrl: "https://snowtrace.io/tx/",
  },
  avaxc: {
    chainId: "0xa86a",
    token: "avax",
    explorerTxUrl: "https://snowtrace.io/tx/",
  },
};

const BRIDGERS_EVM_SOURCE_NETWORKS = new Set([
  "arbitrum",
  "arb",
  "avax",
  "avaxc",
  "avalanche",
  "base",
  "bsc",
  "celo",
  "core",
  "cronos",
  "eth",
  "ethereum",
  "fantom",
  "ftm",
  "gnosis",
  "heco",
  "kava",
  "klaytn",
  "linea",
  "mantle",
  "matic",
  "metis",
  "moonbeam",
  "moonriver",
  "okc",
  "okexchain",
  "op",
  "optimism",
  "polygon",
  "scroll",
  "xdai",
  "zksync",
]);

const SOLANA_SOURCE_NETWORKS = new Set(["sol", "solana"]);

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

type Eip1193Provider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
};

type SolanaProvider = {
  isPhantom?: boolean;
  publicKey?: {
    toBase58: () => string;
  };
  connect: () => Promise<{ publicKey?: { toBase58: () => string } }>;
  signAndSendTransaction?: (
    transaction: Transaction | VersionedTransaction
  ) => Promise<{ signature?: string } | string>;
  signTransaction?: <T extends Transaction | VersionedTransaction>(
    transaction: T
  ) => Promise<T>;
};

type ProviderTransaction = {
  to?: string;
  data?: string;
  rawTx?: string;
  value?: string;
  chainId?: string;
  chainType?: string;
  approvalRequired?: boolean;
};

type ProviderRoute = {
  equipmentNo?: string;
  fromTokenAddress?: string;
  toTokenAddress?: string;
  fromAddress?: string;
  toAddress?: string;
  fromTokenChain?: string;
  toTokenChain?: string;
  fromTokenAmount?: string;
  amountOutMin?: string;
  fromCoinCode?: string;
  toCoinCode?: string;
  slippage?: string;
};

type ExchangeCurrency = {
  ticker?: string;
  network?: string;
  image?: string;
  logoURI?: string;
  icon?: string;
};

type ExchangeRecord = {
  id?: string;
  provider?: string;
  status?: string;
  amountFrom?: string;
  amountTo?: string;
  tickerFrom?: string;
  networkFrom?: string;
  tickerTo?: string;
  networkTo?: string;
  addressFrom?: string;
  addressTo?: string;
  depositExtraId?: string | null;
  depositExtraName?: string | null;
  refundAddress?: string;
  createdAt?: string;
  completedAt?: string;
  rabbit?: {
    transactionId?: string;
    status?: string;
    depositAddress?: string;
    depositExtraId?: string | null;
    depositExtraName?: string | null;
    depositHash?: string | null;
    receiveHash?: string | null;
  };
  changehero?: ExchangeRecord["rabbit"];
  bridgers?: {
    orderId?: string;
    depositAddress?: string;
    depositHash?: string;
    receiveHash?: string;
    remoteStatus?: string;
    tx?: ProviderTransaction;
    approval?: ProviderTransaction & {
      spenderAddress?: string;
    };
    route?: ProviderRoute;
    needsWallet?: boolean;
    executionType?: string;
    amountToSend?: string;
    exchangeId?: string;
    extraFields?: unknown;
    fromCurrency?: ExchangeCurrency;
    toCurrency?: ExchangeCurrency;
  };
  rubic?: ExchangeRecord["bridgers"] & {
    quoteId?: string;
    routeProvider?: string;
    swapType?: string;
  };
  swft?: ExchangeRecord["bridgers"];
  baltex?: ExchangeRecord["bridgers"] & {
    exchangeId?: string;
    exchangeType?: string;
  };
  baltexDefi?: ExchangeRecord["bridgers"] & {
    provider?: string;
    rawTransaction?: unknown;
  };
};

export default function ExchangePage() {
  const { id } = useParams();
  const {
    address: connectedWallet,
    provider,
    connecting,
    connectWalletState,
  } = useWallet();

  const [exchange, setExchange] = useState<ExchangeRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [depositSending, setDepositSending] = useState(false);
  const [depositTxHash, setDepositTxHash] = useState("");
  const [depositError, setDepositError] = useState("");
  const [approvalSending, setApprovalSending] = useState(false);
  const [approvalTxHash, setApprovalTxHash] = useState("");
  const [hasSolanaProvider, setHasSolanaProvider] = useState(false);
  const [manualSolanaDeposit, setManualSolanaDeposit] = useState(false);
  const [manualSourceAddress, setManualSourceAddress] = useState("");

  useEffect(() => {
    if (!id) return;
    let stopped = false;
    let interval: ReturnType<typeof setInterval> | undefined;

    const fetchExchange = async () => {
      try {
        const res = await getExchange(id);
        if (stopped) return;

        setExchange(res);

        const nextProviderSwap =
          res?.baltexDefi || res?.baltex || res?.rubic || res?.bridgers || res?.swft || {};
        if (nextProviderSwap?.depositAddress || res?.addressFrom) {
          setDepositError("");
        }

        if (res?.status === "finished" && interval) {
          clearInterval(interval);
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (!stopped) {
          setLoading(false);
        }
      }
    };

    const refreshWhenVisible = () => {
      if (!document.hidden) {
        fetchExchange();
      }
    };

    interval = setInterval(fetchExchange, 5000);
    window.addEventListener("focus", fetchExchange);
    document.addEventListener("visibilitychange", refreshWhenVisible);
    fetchExchange();

    return () => {
      stopped = true;
      if (interval) clearInterval(interval);
      window.removeEventListener("focus", fetchExchange);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [id]);

  useEffect(() => {
    const updateSolanaProviderState = () => {
      setHasSolanaProvider(Boolean(getSolanaProvider()));
    };

    updateSolanaProviderState();
    const timeout = window.setTimeout(updateSolanaProviderState, 800);

    return () => window.clearTimeout(timeout);
  }, []);

  useEffect(() => {
    if (!exchange?.refundAddress || manualSourceAddress) return;

    setManualSourceAddress(exchange.refundAddress);
  }, [exchange?.refundAddress, manualSourceAddress]);

  const sendAmount = exchange?.amountFrom || "0";
  const receiveAmount = exchange?.amountTo || "0";
  const sendTicker = exchange?.tickerFrom || "";
  const sendNetwork = exchange?.networkFrom || "";
  const receiveTicker = exchange?.tickerTo || "";
  const receiveNetwork = exchange?.networkTo || "";
  const sendNetworkKey = sendNetwork.toLowerCase();
  const sendTickerKey = sendTicker.toLowerCase();
  const nativeDepositNetwork = NATIVE_EVM_DEPOSIT_NETWORKS[sendNetworkKey];
  const isSolanaSource = SOLANA_SOURCE_NETWORKS.has(sendNetworkKey);
  const depositAddress = exchange?.addressFrom || "";
  const depositExtraId =
    exchange?.depositExtraId ||
    exchange?.changehero?.depositExtraId ||
    exchange?.rabbit?.depositExtraId ||
    "";
  const depositExtraLabel =
    exchange?.depositExtraName ||
    exchange?.changehero?.depositExtraName ||
    exchange?.rabbit?.depositExtraName ||
    "Deposit tag / memo";
  const providerSwap =
    exchange?.baltexDefi || exchange?.baltex || exchange?.rubic || exchange?.bridgers || exchange?.swft || {};
  const isRubicExchange = exchange?.provider === "rubic";
  const isBaltexDefiExchange = exchange?.provider === "baltex-defi";
  const isBaltexExchange = exchange?.provider === "baltex";
  const isWalletRouteExchange =
    isBaltexDefiExchange ||
    isRubicExchange ||
    exchange?.provider === "bridgers" ||
    exchange?.provider === "swft";
  const providerDisplayName = isBaltexExchange
    ? "Baltex"
    : isBaltexDefiExchange
    ? "Baltex DeFi"
    : isRubicExchange
    ? "Rubic"
    : "Bridgers";
  const providerTx = providerSwap?.tx || {};
  const approvalTx = providerSwap?.approval || {};
  const sendImage = getExchangeCurrencyImage(providerSwap?.fromCurrency);
  const receiveImage = getExchangeCurrencyImage(providerSwap?.toCurrency);
  const providerDepositAddress = providerSwap?.depositAddress || "";
  const isProviderDepositRoute =
    Boolean(providerDepositAddress) && providerSwap?.needsWallet === false;
  const providerTransactionTarget = isProviderDepositRoute ? "" : providerTx?.to || "";
  const manualSolanaDepositMode =
    isRubicExchange &&
    isSolanaSource &&
    !isProviderDepositRoute &&
    !providerTx?.data &&
    (!hasSolanaProvider || manualSolanaDeposit);
  const submittedDepositTxHash = depositTxHash || providerSwap?.depositHash || "";
  const actionTarget = isWalletRouteExchange
      ? providerTransactionTarget || providerTx?.data || providerTx?.rawTx || providerDepositAddress
    : depositAddress;
  const actionTargetLabel = isWalletRouteExchange
    ? isProviderDepositRoute || manualSolanaDepositMode
      ? `${sendTicker.toUpperCase() || "Crypto"} deposit address`
      : isSolanaSource
      ? `${providerDisplayName} Solana transaction`
      : providerTransactionTarget
      ? `${providerDisplayName} transaction target`
      : `${sendTicker.toUpperCase() || "Crypto"} deposit address`
    : `${sendTicker.toUpperCase()} deposit address`;
  const approvalRequired =
    isWalletRouteExchange &&
    Boolean(approvalTx?.approvalRequired && approvalTx?.to && approvalTx?.data);
  const exchangeStatus = exchange?.status || "created";
  const isFinished = exchangeStatus === "finished";
  const canPrepareProviderWalletTransaction =
    isWalletRouteExchange &&
    !isProviderDepositRoute &&
    (BRIDGERS_EVM_SOURCE_NETWORKS.has(sendNetworkKey) ||
      Boolean(NATIVE_EVM_DEPOSIT_NETWORKS[sendNetworkKey]) ||
      isSolanaSource);
  const canSendDepositFromConnectedWallet =
    isWalletRouteExchange
      ? canPrepareProviderWalletTransaction
      : Boolean(nativeDepositNetwork) &&
        nativeDepositNetwork.token === sendTickerKey &&
        Boolean(depositAddress) &&
        Number(sendAmount) > 0;
  const depositExplorerUrl =
    isSolanaSource && submittedDepositTxHash
      ? `https://solscan.io/tx/${submittedDepositTxHash}`
      : nativeDepositNetwork && submittedDepositTxHash
      ? `${nativeDepositNetwork.explorerTxUrl}${submittedDepositTxHash}`
      : "";
  const routeLabel = `${sendTicker.toUpperCase() || "-"} -> ${
    receiveTicker.toUpperCase() || "-"
  }`;

  const currentStep = useMemo(() => {
    switch (exchangeStatus) {
      case "created":
      case "waiting":
        return 2;
      case "confirming":
        return 3;
      case "sending":
        return 4;
      case "finished":
        return 5;
      default:
        return loading ? 1 : 2;
    }
  }, [exchangeStatus, loading]);
  const depositActionSubmitted =
    Boolean(submittedDepositTxHash) ||
    currentStep > 2 ||
    ["confirming", "sending", "finished", "refunded", "failed"].includes(
      exchangeStatus
    );

  async function copyActionTarget() {
    if (!actionTarget) return;

    try {
      await navigator.clipboard.writeText(actionTarget);
      setDepositError("");
    } catch {
      setDepositError("Could not copy the address. Select and copy it manually.");
    }
  }

  async function copyDepositExtraId() {
    if (!depositExtraId) return;

    try {
      await navigator.clipboard.writeText(depositExtraId);
      setDepositError("");
    } catch {
      setDepositError("Could not copy the memo. Select and copy it manually.");
    }
  }

  async function sendDepositFromWallet() {
    if (isWalletRouteExchange) {
      await sendProviderRouteTransaction();
      return;
    }

    setDepositError("");
    setDepositTxHash("");

    if (!canSendDepositFromConnectedWallet || !nativeDepositNetwork) {
      setDepositError("This asset must be deposited manually to the address below.");
      return;
    }

    try {
      setDepositSending(true);

      const walletProvider = provider || (await connectWalletState())?.provider;
      if (!walletProvider) {
        throw new Error("No connected wallet provider was found.");
      }

      const eip1193Provider = walletProvider as unknown as Eip1193Provider;
      const currentChainId = await eip1193Provider.request({
        method: "eth_chainId",
      });

      if (
        typeof currentChainId === "string" &&
        currentChainId.toLowerCase() !== nativeDepositNetwork.chainId.toLowerCase()
      ) {
        await eip1193Provider.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: nativeDepositNetwork.chainId }],
        });
      }

      const browserProvider = new BrowserProvider(eip1193Provider);
      const signer = await browserProvider.getSigner();
      const tx = await signer.sendTransaction({
        to: depositAddress,
        value: parseEther(sendAmount),
      });

      setDepositTxHash(tx.hash);
    } catch (error) {
      setDepositError(getWalletErrorMessage(error));
    } finally {
      setDepositSending(false);
    }
  }

  async function sendApprovalTransaction() {
    setDepositError("");
    setApprovalTxHash("");

    if (!approvalRequired) return;

    try {
      setApprovalSending(true);

      const signer = await getWalletSigner(approvalTx?.chainId || providerTx?.chainId);
      const tx = await signer.sendTransaction({
        to: approvalTx.to,
        data: approvalTx.data,
        value: approvalTx.value || "0x0",
      });

      setApprovalTxHash(tx.hash);
    } catch (error) {
      setDepositError(getWalletErrorMessage(error));
    } finally {
      setApprovalSending(false);
    }
  }

  async function sendProviderRouteTransaction() {
    setDepositError("");
    setDepositTxHash("");

    try {
      setDepositSending(true);

      let nextExchange = exchange;
      let nextProviderSwap =
        nextExchange?.baltexDefi || nextExchange?.rubic || nextExchange?.bridgers || nextExchange?.swft || {};
      let nextProviderTx = nextProviderSwap?.tx || {};
      let nextApprovalTx = nextProviderSwap?.approval || {};

      const hasPreparedProviderTransaction = isSolanaSource
        ? Boolean(nextProviderTx?.data || nextProviderTx?.rawTx)
        : Boolean(
            (nextProviderTx?.to && nextProviderTx?.data) ||
              nextProviderTx?.rawTx
          );

      if (!hasPreparedProviderTransaction) {
        const manualDeposit = isSolanaSource && !getSolanaProvider();
        const fromAddress = manualDeposit
          ? manualSourceAddress.trim()
          : isSolanaSource
          ? await connectSolanaWalletAddress()
          : await getEvmSignerAddress();

        if (manualDeposit) {
          setHasSolanaProvider(false);
          setManualSolanaDeposit(true);

          if (!fromAddress) {
            return;
          }
        }

        if (!id) {
          throw new Error("Exchange ID is missing.");
        }

        nextExchange = await prepareExchangeTransaction(id, {
          fromAddress,
          manualDeposit,
        });
        setExchange(nextExchange);
        nextProviderSwap =
          nextExchange?.baltexDefi || nextExchange?.rubic || nextExchange?.bridgers || nextExchange?.swft || {};
        nextProviderTx = nextProviderSwap?.tx || {};
        nextApprovalTx = nextProviderSwap?.approval || {};

        if (manualDeposit && nextProviderSwap?.depositAddress) {
          setManualSolanaDeposit(false);
          return;
        }
      }

      if (
        nextApprovalTx?.approvalRequired &&
        nextApprovalTx?.to &&
        nextApprovalTx?.data &&
        !approvalTxHash
      ) {
        setDepositError(
          `Approve token spend first, then confirm the ${providerDisplayName} swap.`
        );
        return;
      }

      if (
        !(nextProviderTx?.data || nextProviderTx?.rawTx) ||
        (!isSolanaSource && !nextProviderTx?.to && !nextProviderTx?.rawTx)
      ) {
        throw new Error(
          `${providerDisplayName} transaction data is unavailable. Create a new quote and try again.`
        );
      }

      const txHash = isSolanaSource
        ? await sendSolanaTransaction(nextProviderTx.data || nextProviderTx.rawTx || "")
        : await sendEvmProviderTransaction(nextProviderTx);

      setDepositTxHash(txHash);
      const confirmedExchange = await confirmExchange({
        id,
        orderId: nextProviderSwap?.orderId || id,
        txHash,
        route: nextProviderSwap?.route,
      });
      setExchange(confirmedExchange);
    } catch (error) {
      setDepositError(getWalletErrorMessage(error));
    } finally {
      setDepositSending(false);
    }
  }

  async function getWalletSigner(chainId?: string) {
    const walletProvider = provider || (await connectWalletState())?.provider;
    if (!walletProvider) {
      throw new Error("No connected wallet provider was found.");
    }

    const eip1193Provider = walletProvider as unknown as Eip1193Provider;

    if (chainId) {
      const currentChainId = await eip1193Provider.request({
        method: "eth_chainId",
      });

      if (
        typeof currentChainId === "string" &&
        currentChainId.toLowerCase() !== chainId.toLowerCase()
      ) {
        await eip1193Provider.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId }],
        });
      }
    }

    const browserProvider = new BrowserProvider(eip1193Provider);
    return browserProvider.getSigner();
  }

  async function getEvmSignerAddress() {
    const walletSigner = await getWalletSigner();
    return walletSigner.getAddress();
  }

  async function sendEvmProviderTransaction(providerTransaction: ProviderTransaction) {
    if (providerTransaction.rawTx && !providerTransaction.to) {
      const walletProvider = provider || (await connectWalletState())?.provider;
      if (!walletProvider) {
        throw new Error("No connected wallet provider was found.");
      }

      const hash = await (walletProvider as unknown as Eip1193Provider).request({
        method: "eth_sendRawTransaction",
        params: [providerTransaction.rawTx],
      });

      if (typeof hash !== "string" || !hash) {
        throw new Error("The wallet did not return a transaction hash.");
      }

      return hash;
    }

    const signer = await getWalletSigner(providerTransaction.chainId);
    const tx = await signer.sendTransaction({
      to: providerTransaction.to,
      data: providerTransaction.data,
      value: providerTransaction.value || "0x0",
    });

    return tx.hash;
  }

  async function connectSolanaWalletAddress() {
    const solanaProvider = getSolanaProvider();

    if (!solanaProvider) {
      throw new Error(
        "No Solana wallet was found. Install or unlock Phantom, then try again."
      );
    }

    const result = await solanaProvider.connect();
    const publicKey = result?.publicKey || solanaProvider.publicKey;
    const address = publicKey?.toBase58();

    if (!address) {
      throw new Error("No Solana wallet address was selected.");
    }

    return address;
  }

  async function sendSolanaTransaction(serializedTransaction: string) {
    const solanaProvider = getSolanaProvider();

    if (!solanaProvider) {
      throw new Error(
        "No Solana wallet was found. Install or unlock Phantom, then try again."
      );
    }

    await solanaProvider.connect();
    const transaction = deserializeSolanaTransaction(serializedTransaction);

    if (solanaProvider.signAndSendTransaction) {
      const result = await solanaProvider.signAndSendTransaction(transaction);
      const signature = typeof result === "string" ? result : result.signature;

      if (!signature) {
        throw new Error(
          "The Solana wallet did not return a transaction signature."
        );
      }

      return signature;
    }

    if (!solanaProvider.signTransaction) {
      throw new Error("This Solana wallet cannot sign transactions from the browser.");
    }

    const signedTransaction = await solanaProvider.signTransaction(transaction);
    const connection = new Connection(
      import.meta.env.VITE_SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com",
      "confirmed"
    );

    return connection.sendRawTransaction(signedTransaction.serialize());
  }

  return (
    <div className="min-h-screen overflow-hidden bg-[#030817] text-white">
      <Navbar />

      <main className="relative border-b border-white/10">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_75%_18%,rgba(73,93,255,0.16),transparent_42%),radial-gradient(circle_at_20%_24%,rgba(126,82,255,0.11),transparent_36%),linear-gradient(180deg,rgba(3,8,23,0)_0%,rgba(3,8,23,0.92)_100%)]" />
        <div className="pointer-events-none absolute right-[8%] top-[120px] h-[520px] w-[520px] rounded-full bg-[radial-gradient(circle,rgba(126,82,255,0.18),rgba(71,124,255,0.08)_48%,transparent_72%)] blur-[42px]" />

        <section className="relative z-10 mx-auto grid max-w-[1600px] gap-8 px-5 py-8 sm:px-8 lg:grid-cols-[minmax(0,1fr)_390px] lg:px-[90px] lg:py-12">
          <section className="rounded-[18px] border border-white/10 bg-[#090F22]/95 p-5 shadow-[0_32px_110px_rgba(0,0,0,0.42)] backdrop-blur-xl sm:p-6 lg:p-7">
            <button
              type="button"
              onClick={() => window.history.back()}
              className="mb-5 inline-flex h-10 items-center gap-2 rounded-[9px] border border-white/10 bg-white/[0.035] px-4 text-[14px] font-bold text-[#A9B2C9] transition hover:border-[#7E52FF]/40 hover:bg-white/[0.06] hover:text-white active:scale-95"
            >
              <ArrowLeft size={17} />
              Back
            </button>

            <div className="flex flex-col gap-5 border-b border-white/[0.07] pb-6 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="inline-flex h-9 items-center gap-2 rounded-[9px] border border-[#7E52FF]/35 bg-[#7E52FF]/10 px-4 text-[13px] font-bold text-[#C7B9FF]">
                  <ShieldCheck size={16} />
                  Wallet confirmation
                </p>
                <h1 className="mt-4 text-[32px] font-black leading-tight text-white sm:text-[40px]">
                  {isFinished ? "Exchange" : "Exchange in"}{" "}
                  <span className="bg-gradient-to-r from-[#9F61FF] to-[#477CFF] bg-clip-text text-transparent">
                    {isFinished ? "complete." : "progress."}
                  </span>
                </h1>
                <p className="mt-3 max-w-[620px] text-[15px] font-medium leading-6 text-[#9AA6BF] sm:text-[16px]">
                  {isFinished
                    ? "The swap has completed and the output funds were sent to the recipient wallet."
                    : "Complete the wallet confirmation, then track the swap as it moves through confirmations and routing."}
                </p>
              </div>

              <StatusPill status={loading ? "loading" : exchangeStatus} />
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:items-stretch">
              <TokenAmount
                label="You send"
                amount={sendAmount}
                ticker={sendTicker}
                network={sendNetwork}
                image={sendImage}
              />
              <div className="flex items-center justify-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-[12px] border border-[#7B5CFF]/45 bg-[#121936] text-[#A889FF] shadow-[0_0_28px_rgba(124,92,255,0.22)]">
                  <ArrowRight size={19} />
                </div>
              </div>
              <TokenAmount
                label="You receive"
                amount={`~ ${receiveAmount}`}
                ticker={receiveTicker}
                network={receiveNetwork}
                image={receiveImage}
              />
            </div>

            {isFinished ? (
              <FinishedState
                sendAmount={sendAmount}
                sendTicker={sendTicker}
                receiveAmount={receiveAmount}
                receiveTicker={receiveTicker}
              />
            ) : (
              <section className="relative mt-8">
                <div className="absolute bottom-[22px] left-[15px] top-[18px] w-px bg-white/10" />

                <StepBlock
                  completed={currentStep > 1}
                  active={currentStep === 1}
                  number="1"
                  title="Exchange created"
                  text={exchange?.createdAt || "Route prepared"}
                >
                  <span className="inline-flex rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-[12px] font-bold text-emerald-200">
                    Completed
                  </span>
                </StepBlock>

                <StepBlock
                  completed={currentStep > 2}
                  active={currentStep === 2}
                  number="2"
                  title={
                    isProviderDepositRoute
                      ? `Send ${sendTicker.toUpperCase()}`
                      : isWalletRouteExchange && canPrepareProviderWalletTransaction
                      ? "Confirm swap"
                      : `Send ${sendTicker.toUpperCase()}`
                  }
                  text={
                    isWalletRouteExchange
                      ? isProviderDepositRoute
                        ? `Send exactly ${
                            providerSwap?.amountToSend || sendAmount
                          } ${sendTicker.toUpperCase()} to the deposit address.`
                        : manualSolanaDepositMode
                        ? "Enter your Solana source address to generate a manual deposit address."
                        : !canPrepareProviderWalletTransaction
                        ? `Send the exact amount of ${sendTicker.toUpperCase()} to the deposit address.`
                        : isSolanaSource
                        ? `Connect your Solana wallet to prepare and sign the ${providerDisplayName} transaction.`
                        : providerTransactionTarget
                        ? `Review and sign the ${providerDisplayName} transaction in your connected wallet.`
                        : "Send manually to the deposit address, or connect your wallet to prepare a signed transaction."
                      : `Send the exact amount of ${sendTicker.toUpperCase()} to the deposit address.`
                  }
                >
                  <ActionPanel
                    isWalletRouteExchange={isWalletRouteExchange}
                    providerDisplayName={providerDisplayName}
                    target={actionTarget}
                    targetLabel={actionTargetLabel}
                    depositExtraId={depositExtraId}
                    depositExtraLabel={depositExtraLabel}
                    emptyTargetText={
                      manualSolanaDepositMode
                        ? "Enter Solana address to generate deposit address"
                        : canSendDepositFromConnectedWallet
                        ? "Connect wallet to prepare transaction"
                        : "Waiting for deposit address"
                    }
                    ticker={sendTicker}
                    network={sendNetwork}
                    image={sendImage}
                    approvalRequired={approvalRequired}
                    approvalSending={approvalSending}
                    approvalTxHash={approvalTxHash}
                    connecting={connecting}
                    connectedWallet={connectedWallet}
                    canSendDepositFromConnectedWallet={canSendDepositFromConnectedWallet}
                    depositSending={depositSending}
                    depositTxHash={submittedDepositTxHash}
                    depositExplorerUrl={depositExplorerUrl}
                    depositError={depositError}
                    depositActionSubmitted={depositActionSubmitted}
                    sendAmount={sendAmount}
                    manualDepositMode={manualSolanaDepositMode}
                    manualSourceAddress={manualSourceAddress}
                    providerDepositAmount={providerSwap?.amountToSend || ""}
                    providerExchangeId={providerSwap?.exchangeId || ""}
                    onManualSourceAddressChange={setManualSourceAddress}
                    onCopyDepositAddress={copyActionTarget}
                    onCopyDepositExtraId={copyDepositExtraId}
                    onApprove={sendApprovalTransaction}
                    onSendDeposit={sendDepositFromWallet}
                  />
                </StepBlock>

                <StepBlock
                  completed={currentStep > 3}
                  active={currentStep === 3}
                  number="3"
                  title="Confirmations"
                  text="Wait for the source chain to confirm the transaction."
                />

                <StepBlock
                  completed={currentStep > 4}
                  active={currentStep === 4}
                  number="4"
                  title="Exchanging"
                  text={`Route ${sendTicker.toUpperCase() || "crypto"} into ${
                    receiveTicker.toUpperCase() || "crypto"
                  }.`}
                />

                <StepBlock
                  completed={currentStep === 5}
                  active={currentStep === 5}
                  number="5"
                  title="Complete"
                  text={`${receiveTicker.toUpperCase() || "Funds"} will be sent to your wallet.`}
                  isLast
                />
              </section>
            )}
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
                Status updates refresh automatically while the exchange is in progress.
              </p>

              <div className="mt-5 grid gap-3">
                <InfoRow label="Exchange ID" value={id || ""} />
                <InfoRow label="Status" value={loading ? "Loading" : formatStatus(exchangeStatus)} />
                <InfoRow
                  label="Send"
                  value={`${sendAmount} ${sendTicker.toUpperCase()}`}
                />
                <InfoRow
                  label="Receive"
                  value={`~ ${receiveAmount} ${receiveTicker.toUpperCase()}`}
                />
                {!isFinished && <InfoRow label="Estimated time" value="~ 5-30 minutes" />}
                {isFinished && (
                  <InfoRow label="Completed" value={exchange?.completedAt || "Just now"} />
                )}
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
                    DirectSwapX prepares the route. You authorize the transaction from
                    your own wallet.
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

function ActionPanel({
  isWalletRouteExchange,
  providerDisplayName,
  target,
  targetLabel,
  depositExtraId,
  depositExtraLabel,
  emptyTargetText,
  ticker,
  network,
  image,
  approvalRequired,
  approvalSending,
  approvalTxHash,
  connecting,
  connectedWallet,
  canSendDepositFromConnectedWallet,
  depositSending,
  depositTxHash,
  depositExplorerUrl,
  depositError,
  depositActionSubmitted,
  sendAmount,
  manualDepositMode,
  manualSourceAddress,
  providerDepositAmount,
  providerExchangeId,
  onManualSourceAddressChange,
  onCopyDepositAddress,
  onCopyDepositExtraId,
  onApprove,
  onSendDeposit,
}: {
  isWalletRouteExchange: boolean;
  providerDisplayName: string;
  target: string;
  targetLabel: string;
  depositExtraId: string;
  depositExtraLabel: string;
  emptyTargetText: string;
  ticker: string;
  network: string;
  image: string;
  approvalRequired: boolean;
  approvalSending: boolean;
  approvalTxHash: string;
  connecting: boolean;
  connectedWallet?: string;
  canSendDepositFromConnectedWallet: boolean;
  depositSending: boolean;
  depositTxHash: string;
  depositExplorerUrl: string;
  depositError: string;
  depositActionSubmitted: boolean;
  sendAmount: string;
  manualDepositMode: boolean;
  manualSourceAddress: string;
  providerDepositAmount: string;
  providerExchangeId: string;
  onManualSourceAddressChange: (value: string) => void;
  onCopyDepositAddress: () => void;
  onCopyDepositExtraId: () => void;
  onApprove: () => void;
  onSendDeposit: () => void;
}) {
  return (
    <div className="mt-5 rounded-[12px] border border-white/10 bg-[#11182D] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] sm:p-5">
      <p className="text-[13px] font-bold text-[#8F9AB5]">{targetLabel}</p>

      <div className="mt-4 flex items-center justify-between gap-4 rounded-[10px] border border-white/10 bg-white/[0.035] px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <TokenIcon ticker={ticker} network={network} image={image} size="lg" />
          <span className="truncate text-[14px] font-bold text-white sm:text-[15px]">
            {target || emptyTargetText}
          </span>
        </div>

        {target && (
          <button
            type="button"
            onClick={onCopyDepositAddress}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[9px] border border-white/10 bg-white/[0.04] text-[#A9B2C9] transition hover:bg-white/[0.08] hover:text-white active:scale-95"
            title="Copy deposit address"
          >
            <Copy size={17} />
          </button>
        )}
      </div>

      {manualDepositMode && !target && (
        <div className="mt-3 rounded-[10px] border border-cyan-300/20 bg-cyan-400/[0.06] px-4 py-3">
          <label className="text-[12px] font-bold text-cyan-100">
            Solana source address
          </label>
          <input
            value={manualSourceAddress}
            onChange={(event) => onManualSourceAddressChange(event.target.value)}
            placeholder="Solana refund/source address"
            className="mt-2 h-11 w-full rounded-[9px] border border-white/10 bg-[#0B1228] px-3 text-[14px] font-semibold text-white outline-none transition placeholder:text-[#5F6982] focus:border-cyan-300/45"
          />
        </div>
      )}

      {target && (providerDepositAmount || providerExchangeId) && (
        <div className="mt-3 grid gap-2 rounded-[10px] border border-blue-300/20 bg-blue-400/[0.06] px-4 py-3 text-[13px] font-semibold text-blue-100">
          {providerDepositAmount && (
            <p>
              Send exactly {providerDepositAmount} {ticker.toUpperCase()}.
            </p>
          )}
          {providerExchangeId && (
            <p className="break-all text-[#A9BFEA]">
              Provider exchange ID: {providerExchangeId}
            </p>
          )}
        </div>
      )}

      {depositExtraId && (
        <div className="mt-3 flex items-center justify-between gap-4 rounded-[10px] border border-amber-300/20 bg-amber-300/[0.06] px-4 py-3">
          <div className="min-w-0">
            <p className="text-[12px] font-bold text-amber-100">
              {depositExtraLabel}
            </p>
            <p className="mt-1 break-all text-[14px] font-black text-white">
              {depositExtraId}
            </p>
          </div>
          <button
            type="button"
            onClick={onCopyDepositExtraId}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[9px] border border-amber-200/20 bg-amber-200/[0.08] text-amber-100 transition hover:bg-amber-200/[0.14] hover:text-white active:scale-95"
            title="Copy deposit memo"
          >
            <Copy size={17} />
          </button>
        </div>
      )}

      {approvalRequired && (
        <button
          type="button"
          onClick={onApprove}
          disabled={approvalSending || connecting || Boolean(approvalTxHash)}
          className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-[10px] border border-[#7B5CFF]/45 bg-[#21183F] px-5 text-[15px] font-bold text-[#C3B4FF] transition hover:border-[#9D85FF] hover:text-white active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {approvalSending ? <Loader2 size={18} className="animate-spin" /> : <Wallet size={18} />}
          {approvalSending ? "Waiting for approval..." : "Approve token spend"}
        </button>
      )}

      {approvalTxHash && (
        <p className="mt-3 text-[13px] font-bold text-emerald-200">
          Approval submitted: {approvalTxHash.slice(0, 10)}...
        </p>
      )}

      {canSendDepositFromConnectedWallet && (
        <button
          type="button"
          onClick={onSendDeposit}
          disabled={
            depositSending ||
            connecting ||
            depositActionSubmitted ||
            (manualDepositMode && !manualSourceAddress.trim())
          }
          className="mt-5 flex h-[52px] w-full items-center justify-center gap-3 rounded-[10px] bg-gradient-to-r from-[#7B3FF2] to-[#477CFF] text-[15px] font-bold text-white shadow-[0_18px_42px_rgba(73,104,255,0.22)] transition hover:translate-y-[-1px] hover:shadow-[0_22px_52px_rgba(73,104,255,0.3)] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-55 disabled:hover:translate-y-0"
        >
          {depositSending ? <Loader2 size={19} className="animate-spin" /> : depositActionSubmitted ? <Check size={19} /> : <Wallet size={19} />}
          {depositActionSubmitted
            ? "Deposit submitted"
            : manualDepositMode
            ? depositSending
              ? "Preparing deposit address..."
              : "Get deposit address"
            : isWalletRouteExchange
            ? depositSending
              ? "Waiting for wallet..."
              : `Confirm ${providerDisplayName} swap`
            : connectedWallet
              ? depositSending
                ? "Waiting for wallet..."
                : `Send ${sendAmount} ${ticker.toUpperCase()}`
              : depositSending
                ? "Connecting..."
                : "Connect and send deposit"}
        </button>
      )}

      {connectedWallet && !canSendDepositFromConnectedWallet && !isWalletRouteExchange && (
        <p className="mt-4 text-[13px] font-medium leading-5 text-[#8F9AB5]">
          Connected-wallet sending is available only for native EVM deposits.
          Send this asset manually to the address above.
        </p>
      )}

      {isWalletRouteExchange && !canSendDepositFromConnectedWallet && (
        <p className="mt-4 text-[13px] font-medium leading-5 text-[#8F9AB5]">
          Connected-wallet signing is only available for EVM and Solana source networks.
          Send this asset manually to the address above.
        </p>
      )}

      {depositTxHash && depositExplorerUrl && (
        <a
          href={depositExplorerUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-4 inline-flex items-center gap-2 text-[14px] font-bold text-[#A889FF] transition hover:text-white"
        >
          View deposit transaction
          <ExternalLink size={15} />
        </a>
      )}

      {depositTxHash && !depositExplorerUrl && (
        <p className="mt-4 break-all text-[13px] font-bold text-[#A9B2C9]">
          Transaction submitted: {depositTxHash}
        </p>
      )}

      {depositError && (
        <p className="mt-4 rounded-[8px] border border-red-400/25 bg-red-500/10 px-4 py-3 text-[14px] font-semibold text-red-200">
          {depositError}
        </p>
      )}
    </div>
  );
}

function FinishedState({
  sendAmount,
  sendTicker,
  receiveAmount,
  receiveTicker,
}: {
  sendAmount: string;
  sendTicker: string;
  receiveAmount: string;
  receiveTicker: string;
}) {
  return (
    <div className="flex flex-col items-center py-14 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-full border border-emerald-400/20 bg-emerald-500/10 text-emerald-200 shadow-[0_0_40px_rgba(16,185,129,0.16)]">
        <Check size={32} />
      </div>

      <h2 className="mt-7 text-[32px] font-black leading-tight text-white">
        Finished successfully
      </h2>
      <p className="mt-3 max-w-[560px] text-[15px] font-medium leading-6 text-[#9AA6BF] sm:text-[16px]">
        The exchange is complete and {receiveTicker.toUpperCase()} has been sent
        to the recipient wallet.
      </p>

      <div className="mt-8 grid w-full max-w-[620px] gap-3 rounded-[12px] border border-white/10 bg-[#11182D] p-4 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:items-center">
        <SummaryAmount label="Sent" value={`${sendAmount} ${sendTicker.toUpperCase()}`} />
        <div className="flex justify-center text-[#7B5CFF]">
          <ArrowRight size={20} />
        </div>
        <SummaryAmount label="Received" value={`~ ${receiveAmount} ${receiveTicker.toUpperCase()}`} />
      </div>

      <button
        type="button"
        onClick={() => {
          window.location.href = "/";
        }}
        className="mt-8 flex h-[52px] items-center justify-center gap-3 rounded-[10px] bg-gradient-to-r from-[#7B3FF2] to-[#477CFF] px-7 text-[15px] font-bold text-white shadow-[0_18px_42px_rgba(73,104,255,0.22)] transition hover:translate-y-[-1px] hover:shadow-[0_22px_52px_rgba(73,104,255,0.3)] active:scale-[0.99]"
      >
        Create a new exchange
        <ArrowRight size={18} />
      </button>
    </div>
  );
}

function TokenAmount({
  label,
  amount,
  ticker,
  network,
  image,
}: {
  label: string;
  amount: string;
  ticker: string;
  network: string;
  image: string;
}) {
  return (
    <div className="min-w-0 rounded-[12px] border border-white/10 bg-[#11182D] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
      <p className="text-[13px] font-bold text-[#8F9AB5]">{label}</p>
      <div className="mt-3 flex min-w-0 items-center gap-3">
        <TokenIcon ticker={ticker} network={network} image={image} size="md" />
        <div className="min-w-0">
          <p className="truncate text-[20px] font-black leading-tight text-white">
            {amount} {ticker.toUpperCase()}
          </p>
          <p className="mt-1 text-[12px] font-bold uppercase text-[#7F8AA6]">
            {network || "network"}
          </p>
        </div>
      </div>
    </div>
  );
}

function SummaryAmount({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[13px] font-bold text-[#8F9AB5]">{label}</p>
      <p className="mt-1 break-words text-[18px] font-black text-white">{value}</p>
    </div>
  );
}

function StepBlock({
  completed,
  active,
  number,
  title,
  text,
  children,
  isLast,
}: {
  completed?: boolean;
  active?: boolean;
  number: string;
  title: string;
  text: string;
  children?: ReactNode;
  isLast?: boolean;
}) {
  return (
    <div className={`relative flex gap-5 ${isLast ? "pb-0" : "pb-6"}`}>
      <StepNode completed={completed} active={active} number={number} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="text-[19px] font-black tracking-normal text-white">
              {title}
            </h3>
            <p className="mt-1 text-[14px] font-medium leading-6 text-[#8F9AB5]">
              {text}
            </p>
          </div>
        </div>
        {children && <div>{children}</div>}
      </div>
    </div>
  );
}

function StepNode({
  completed,
  active,
  number,
}: {
  completed?: boolean;
  active?: boolean;
  number: string;
}) {
  if (completed) {
    return (
      <div className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-[#7B3FF2] to-[#477CFF] text-white shadow-[0_0_26px_rgba(73,104,255,0.26)]">
        <Check size={17} />
      </div>
    );
  }

  if (active) {
    return (
      <div className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#7B5CFF]/55 bg-[#21183F] text-[13px] font-black text-[#C3B4FF] shadow-[0_0_26px_rgba(124,92,255,0.22)]">
        {number}
      </div>
    );
  }

  return (
    <div className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/[0.05] text-[13px] font-black text-[#8F9AB5]">
      {number}
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const finished = status === "finished";

  return (
    <span
      className={`inline-flex h-9 w-fit items-center gap-2 rounded-full border px-4 text-[13px] font-bold ${
        finished
          ? "border-emerald-400/25 bg-emerald-500/10 text-emerald-200"
          : "border-[#7E52FF]/35 bg-[#7E52FF]/10 text-[#C7B9FF]"
      }`}
    >
      <span
        className={`h-2 w-2 rounded-full ${
          finished ? "bg-emerald-300" : "bg-[#A889FF]"
        }`}
      />
      {formatStatus(status)}
    </span>
  );
}

function Panel({ children }: { children: ReactNode }) {
  return (
    <section className="rounded-[18px] border border-white/10 bg-[#090F22]/88 p-5 shadow-[0_24px_80px_rgba(0,0,0,0.26)] backdrop-blur-xl">
      {children}
    </section>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-[10px] bg-white/[0.035] px-4 py-3">
      <span className="text-[13px] font-semibold text-[#8F9AB5]">{label}</span>
      <span className="break-all text-right text-[14px] font-black capitalize text-white">
        {value}
      </span>
    </div>
  );
}

function TokenIcon({
  ticker,
  network,
  image,
  size,
}: {
  ticker: string;
  network: string;
  image?: string;
  size: "md" | "lg";
}) {
  const [sourceIndex, setSourceIndex] = useState(0);
  const [failed, setFailed] = useState(false);
  const sources = getTokenIconSources(ticker, network, image);
  const className = size === "lg" ? "h-9 w-9 text-[12px]" : "h-8 w-8 text-[11px]";

  useEffect(() => {
    setSourceIndex(0);
    setFailed(false);
  }, [ticker, network, image]);

  if (failed || !sources.length) {
    return (
      <div
        className={`flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500/25 to-blue-500/20 font-bold uppercase text-violet-200 ring-1 ring-white/10 ${className}`}
      >
        {ticker.slice(0, 2)}
      </div>
    );
  }

  return (
    <img
      src={sources[sourceIndex]}
      alt={`${ticker}-${network}`}
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

function getWalletErrorMessage(error: unknown) {
  const maybeError = error as { code?: number; shortMessage?: string; message?: string };

  if (maybeError?.code === 4001) {
    return "Transaction was rejected in the wallet.";
  }

  return (
    maybeError?.shortMessage ||
    maybeError?.message ||
    "Could not send the deposit transaction. Check the wallet network, balance, and deposit details."
  );
}

function getSolanaProvider() {
  const maybeWindow = window as Window & { solana?: SolanaProvider };
  return maybeWindow.solana || null;
}

function deserializeSolanaTransaction(serializedTransaction: string) {
  const bytes = base64ToBytes(serializedTransaction);

  try {
    return VersionedTransaction.deserialize(bytes);
  } catch {
    return Transaction.from(bytes);
  }
}

function base64ToBytes(value: string) {
  const binary = window.atob(value);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

function getExchangeCurrencyImage(currency?: ExchangeCurrency) {
  return normalizeImageUrl(currency?.image || currency?.logoURI || currency?.icon);
}

function getTokenIconSources(ticker?: string, network?: string, image?: string) {
  return unique([
    normalizeImageUrl(image),
    ...getRemoteFallbackIconSources(ticker),
    ...getLocalIconSources(ticker, network),
  ]);
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

function getLocalIconSources(ticker?: string, network?: string) {
  const tickerVariants = getLocalIconTickerVariants(ticker);
  const networkVariants = getLocalIconNetworkVariants(network);

  return tickerVariants.flatMap((tickerValue) => {
    return networkVariants.map((networkValue) => `/icons/${tickerValue}-${networkValue}.svg`);
  });
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

function normalizeImageUrl(value?: string) {
  return String(value || "").trim().replace(/^http:\/\//i, "https://");
}

function clean(value?: string) {
  return String(value || "").trim().toLowerCase();
}

function formatStatus(status: string) {
  if (!status) return "Created";

  return status
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
