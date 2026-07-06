import { useConnectWallet } from "@web3-onboard/react";

function shortenAddress(address: string) {
  return `${address.substring(0, 6)}...${address.slice(-4)}`;
}

export function useWallet() {
  const [{ wallet, connecting }, connect, disconnect] = useConnectWallet();
  const address = wallet?.accounts?.[0]?.address || "";

  async function connectWallet() {
    if (address) return address;

    const connectedWallets = await connect();
    return connectedWallets?.[0]?.accounts?.[0]?.address || "";
  }

  async function connectWalletState() {
    if (wallet) return wallet;

    const connectedWallets = await connect();
    return connectedWallets?.[0] || null;
  }

  async function disconnectWallet() {
    if (!wallet) return;
    await disconnect({ label: wallet.label });
  }

  return {
    connectedWallet: wallet,
    connecting,
    connectWallet,
    connectWalletState,
    disconnectWallet,
    address,
    shortAddress: address ? shortenAddress(address) : "",
    walletLabel: wallet?.label || "",
    provider: wallet?.provider,
    addresses: wallet?.accounts?.map(a => a.address) || [],
    chainIds: wallet?.chains?.map(c => c.id) || [],
  };
}
