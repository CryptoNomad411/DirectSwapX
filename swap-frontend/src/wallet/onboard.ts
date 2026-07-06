import { init } from "@web3-onboard/react";
import injectedModule from "@web3-onboard/injected-wallets";
import walletConnectModule from "@web3-onboard/walletconnect";

const injected = injectedModule();
const walletConnectProjectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID;

const chains = [
  {
    id: "0x1",
    token: "ETH",
    label: "Ethereum",
    rpcUrl: import.meta.env.VITE_ETHEREUM_RPC_URL || "https://ethereum.publicnode.com",
  },
  {
    id: "0x89",
    token: "MATIC",
    label: "Polygon",
    rpcUrl: import.meta.env.VITE_POLYGON_RPC_URL || "https://polygon-rpc.com",
  },
  {
    id: "0x38",
    token: "BNB",
    label: "BNB Smart Chain",
    rpcUrl: import.meta.env.VITE_BSC_RPC_URL || "https://bsc-dataseed.binance.org/",
  },
  {
    id: "0xa4b1",
    token: "ETH",
    label: "Arbitrum One",
    rpcUrl: import.meta.env.VITE_ARBITRUM_RPC_URL || "https://arb1.arbitrum.io/rpc",
  },
  {
    id: "0xa",
    token: "ETH",
    label: "Optimism",
    rpcUrl: import.meta.env.VITE_OPTIMISM_RPC_URL || "https://mainnet.optimism.io",
  },
  {
    id: "0x2105",
    token: "ETH",
    label: "Base",
    rpcUrl: import.meta.env.VITE_BASE_RPC_URL || "https://mainnet.base.org",
  },
  {
    id: "0xa86a",
    token: "AVAX",
    label: "Avalanche",
    rpcUrl: import.meta.env.VITE_AVALANCHE_RPC_URL || "https://api.avax.network/ext/bc/C/rpc",
  },
];

const wallets = walletConnectProjectId
  ? [
      injected,
      walletConnectModule({
        projectId: walletConnectProjectId,
        dappUrl: window.location.origin,
        requiredChains: [1],
        optionalChains: [1, 10, 56, 137, 8453, 42161, 43114],
        qrModalOptions: {
          themeMode: "dark",
          themeVariables: {
            "--wcm-accent-color": "#7B5CFF",
            "--wcm-background-color": "#7B5CFF",
            "--wcm-background-border-radius": "12px",
            "--wcm-container-border-radius": "12px",
            "--wcm-wallet-icon-border-radius": "10px",
          },
          explorerRecommendedWalletIds: [
            "c57ca95c9f4fb92466f30bfbca2e7b2aa518dbb5d4d5a8b164ff874a4efbba37",
            "4622a2b2d6af89a7c182fd33bf3d3ecc2018eec1b2d34c1f5d5c8def8b5551d9",
            "ecc4036f8142f01942c28d24dd531e4b07f56e5f1282b93fc276f529c5681bb8",
            "7674bb4e3535108208eb3f1f5736b629a2c3a20f15cba9a1b5c97df2243ce279",
          ],
        },
      }),
    ]
  : [injected];

export const onboard = init({
  wallets,
  chains,
  theme: {
    "--w3o-background-color": "#070D1F",
    "--w3o-foreground-color": "#11182D",
    "--w3o-text-color": "#F8FAFC",
    "--w3o-border-color": "rgba(255,255,255,0.10)",
    "--w3o-action-color": "#8B5CF6",
    "--w3o-border-radius": "12px",
    "--w3o-font-family":
      "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
  },
  disableFontDownload: true,
  appMetadata: {
    name: "DirectSwap",
    icon: "/images/logo.png",
    description: "DirectSwap wallet connection",
    recommendedInjectedWallets: [
      { name: "MetaMask", url: "https://metamask.io" },
      { name: "Rabby", url: "https://rabby.io" },
      { name: "Coinbase Wallet", url: "https://www.coinbase.com/wallet" },
      { name: "Trust Wallet", url: "https://trustwallet.com/browser-extension" },
      { name: "OKX Wallet", url: "https://www.okx.com/web3" },
      { name: "Phantom", url: "https://phantom.com" },
      { name: "Brave Wallet", url: "https://brave.com/wallet" },
      { name: "Rainbow", url: "https://rainbow.me" },
    ],
  },
  connect: {
    autoConnectLastWallet: true,
    showSidebar: true,
  },
  accountCenter: {
    desktop: {
      enabled: false,
    },
    mobile: {
      enabled: false,
    },
  },
});
