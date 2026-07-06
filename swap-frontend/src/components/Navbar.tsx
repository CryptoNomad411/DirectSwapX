import { LogOut, Wallet } from "lucide-react";
import { Link, NavLink } from "react-router-dom";
import React from "react";
import { useWallet } from "../hooks/useWallet";

export default function Navbar() {
  const {
    address,
    shortAddress,
    walletLabel,
    connecting,
    connectWallet,
    disconnectWallet,
  } = useWallet();

  async function handleConnect() {
    await connectWallet();
  }

  return (
    <header className="h-[72px] w-full border-b border-white/10 bg-[#030817]/95 backdrop-blur">
      <div className="mx-auto grid h-full max-w-[1600px] grid-cols-[1fr_auto_1fr] items-center px-[88px]">
        <Link to="/" className="flex min-w-0 items-center gap-3">
          <BrandMark />
          <span className="hidden text-[26px] font-bold tracking-normal text-white sm:block">
            DirectSwapX
          </span>
        </Link>

        <nav className="hidden items-center gap-[46px] lg:flex">
          <NavItem to="/how-it-works">How it Works</NavItem>
          <NavItem to="/about">About</NavItem>
          <NavItem to="/faq">FAQ</NavItem>
          <NavItem to="/support">Support</NavItem>
        </nav>

        <div className="flex items-center justify-end gap-3">
          {address ? (
            <div className="flex items-center gap-2 rounded-[10px] border border-white/10 bg-white/[0.035] p-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
              <div className="flex min-w-0 items-center gap-2 px-2">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] border border-[#7B5CFF]/35 bg-[#21183F] text-[#C3B4FF]">
                  <Wallet size={16} />
                </span>
                <div className="hidden min-w-0 sm:block">
                  <p
                    className="max-w-[120px] truncate text-[12px] font-bold text-[#8F9AB5]"
                    title={walletLabel}
                  >
                    {walletLabel || "Wallet"}
                  </p>
                  <p className="text-[13px] font-black text-white">{shortAddress}</p>
                </div>
              </div>
              <button
                onClick={disconnectWallet}
                className="flex h-9 items-center gap-2 rounded-[8px] border border-red-300/20 bg-red-500/10 px-3 text-[13px] font-bold text-red-100 transition hover:border-red-300/35 hover:bg-red-500/15 active:scale-95"
              >
                <LogOut size={15} />
                Disconnect
              </button>
            </div>
          ) : (
            <button
              disabled={connecting}
              onClick={handleConnect}
              className="flex h-[44px] items-center gap-2 rounded-[8px] border border-violet-300/35 bg-gradient-to-r from-[#6D45F5] to-[#4B7CFF] px-6 text-[16px] font-bold text-white shadow-[0_0_28px_rgba(93,93,255,0.25)] transition hover:translate-y-[-1px] active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Wallet size={18} />
              {connecting ? "Connecting..." : "Connect Wallet"}
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

type NavItemProps = {
  to: string;
  children: React.ReactNode;
};

function NavItem({ to, children }: NavItemProps) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `text-[16px] font-semibold transition ${
          isActive ? "text-white" : "text-[#B1B9CC] hover:text-white"
        }`
      }
    >
      {children}
    </NavLink>
  );
}

function BrandMark() {
  return (
    <img
      src="/logo.png?v=5"
      alt=""
      aria-hidden="true"
      className="h-10 w-10 rounded-[10px] object-cover"
    />
  );
}
