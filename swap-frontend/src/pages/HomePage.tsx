import {
  ArrowRight,
  BadgePercent,
  BadgeCheck,
  Handshake,
  LockKeyhole,
  Network,
  PlayCircle,
  ShieldCheck,
  Timer,
  Zap,
} from "lucide-react";

import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import SwapCard from "../components/SwapCard";

export default function HomePage() {
  return (
    <div className="min-h-screen overflow-hidden bg-[#030817] text-white">
      <Navbar />

      <main className="relative">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_74%_46%,rgba(73,93,255,0.14),transparent_50%),linear-gradient(180deg,rgba(3,8,23,0)_0%,rgba(3,8,23,0.95)_100%)]" />
        <div className="pointer-events-none absolute right-[16%] top-[172px] h-[470px] w-[760px] rotate-[9deg] rounded-[50%] border border-indigo-300/[0.035]" />
        <div className="pointer-events-none absolute left-[-140px] top-[620px] h-[360px] w-[360px] rounded-full border border-cyan-200/[0.045]" />
        <div className="pointer-events-none absolute left-[-75px] top-[685px] h-[230px] w-[230px] rounded-full border border-violet-200/[0.055]" />
        <div className="pointer-events-none absolute right-[-120px] top-[1230px] h-[420px] w-[420px] rounded-full border border-blue-200/[0.045]" />
        <div className="pointer-events-none absolute right-[8%] top-[1295px] h-[185px] w-[185px] rounded-full bg-cyan-300/[0.025] blur-[2px]" />

        <section className="relative z-10 mx-auto grid max-w-[1600px] gap-10 px-5 pb-8 pt-8 sm:px-8 sm:pb-10 sm:pt-12 lg:grid-cols-[1fr_620px] lg:gap-x-12 lg:gap-y-14 lg:px-[90px] lg:pt-[70px]">
          <div className="pt-[2px]">
            <div className="inline-flex min-h-10 flex-wrap items-center gap-2 rounded-full bg-[#7E52FF]/10 px-5 py-2 text-[14px] font-semibold text-[#C7B9FF]">
              <ShieldCheck size={17} />
              <span>Wallet-first</span>
              <span className="text-[#7E52FF]">/</span>
              <span>No account</span>
              <span className="text-[#7E52FF]">/</span>
              <span>Cross-chain</span>
            </div>

            <h1 className="mt-[30px] max-w-[690px] text-[42px] font-black leading-[1.1] tracking-normal text-white sm:text-[52px] lg:text-[60px]">
              Cross-chain swaps,
              <span className="block">
                made{" "}
                <span className="bg-gradient-to-r from-[#9F61FF] to-[#477CFF] bg-clip-text text-transparent">
                  direct.
                </span>
              </span>
            </h1>

            <p className="mt-[22px] max-w-[610px] text-[18px] font-medium leading-[1.55] text-[#A9B2C9] sm:text-[20px]">
              DirectSwapX gives you live quotes across 1000+ assets without
              accounts or custody. Choose a route, review the details, and swap
              from your own wallet.
            </p>

            <div className="mt-[28px] flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:gap-8">
              <a
                href="#swap"
                className="inline-flex h-[52px] w-full items-center justify-center gap-4 rounded-[12px] bg-gradient-to-r from-[#7B3FF2] to-[#477CFF] text-[16px] font-bold text-white shadow-[0_16px_42px_rgba(75,106,255,0.28)] transition hover:translate-y-[-1px] sm:w-[224px]"
              >
                Start a swap
                <ArrowRight size={23} />
              </a>

              <a
                href="/how-it-works"
                className="inline-flex h-[52px] items-center justify-center gap-3 text-[16px] font-semibold text-[#A9B2C9] transition hover:text-white sm:justify-start"
              >
                <PlayCircle size={24} />
                How it works
              </a>
            </div>
          </div>

          <div id="swap" className="relative pt-[2px]">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute top-[53%] z-0 hidden h-[620px] w-[620px] max-w-none -translate-x-1/2 -translate-y-1/2 lg:block"
            >
              <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle,rgba(126,82,255,0.22)_0%,rgba(71,124,255,0.13)_42%,rgba(36,211,255,0.06)_57%,transparent_72%)] opacity-70 blur-[34px]" />
              <img
                src="/images/swapcard_back.png"
                alt=""
                className="absolute left-1/2 top-1/2 w-[470px] max-w-none -translate-x-1/2 -translate-y-1/2 opacity-[0.18] mix-blend-screen [mask-image:radial-gradient(ellipse_at_center,black_34%,transparent_70%)]"
              />
            </div>
            <div className="relative z-10 w-full max-w-[620px]">
              <SwapCard />
            </div>
          </div>

          <div className="py-9 lg:col-span-2">
            <div className="grid gap-8 lg:grid-cols-[290px_1fr] lg:items-start">
              <div>
                <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-[#7FA2E8]">
                  Swap intelligence
                </p>
                <h2 className="mt-2 max-w-[260px] text-[22px] font-black leading-tight text-white">
                  Helpful checks before you commit.
                </h2>
              </div>

              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
                <FeatureTile
                  icon={<Zap size={19} />}
                  index="01"
                  title="Live route"
                  text="Only routes that support your selected pair are offered."
                />
                <FeatureTile
                  icon={<BadgePercent size={19} />}
                  index="02"
                  title="Fresh quote"
                  text="See the current receive amount before you continue."
                />
                <FeatureTile
                  icon={<LockKeyhole size={18} />}
                  index="03"
                  title="Rate choice"
                  text="Choose the quote type that best fits your swap."
                />
                <FeatureTile
                  icon={<ShieldCheck size={19} />}
                  index="04"
                  title="Guardrails"
                  text="Limits and route requirements are clear before review."
                />
              </div>
            </div>
          </div>

          <section className="relative isolate py-3 lg:col-span-2">

            <div className="relative space-y-14 sm:space-y-16">
              <ServicePanel featured textOnly icon={<BadgeCheck size={24} />} eyebrow="Route intelligence" title="Reliable service" text="Live provider checks and pair validation help you see which routes are available before you start a swap." highlights={["Live route checks", "Clear amount limits", "Quote expiry awareness"]} tone="violet" />
              <PanelDivider />
              <ServicePanel partners icon={<Handshake size={24} />} eyebrow="Connected liquidity" title="Partners" text="Compare routes from established exchange and on-chain liquidity providers in one streamlined swap experience." highlights={["CEX and DEX routes", "Cross-chain options", "Provider-aware routing"]} tone="cyan" flipped />
              <PanelDivider />
              <ServicePanel fast panelImage="/images/fast_crypto_exchange.png" icon={<Timer size={24} />} eyebrow="Built for momentum" title="Fast crypto exchange" text="Move from a live quote to a wallet-ready route in one focused, low-friction flow." highlights={["Live receive estimates", "Clear route review", "On-chain status tracking"]} tone="emerald" />
              <PanelDivider />
              <ServicePanel product panelImage="/images/defi_based.png" icon={<Network size={24} />} eyebrow="On-chain flexibility" title="DeFi-based" text="Use Baltex DeFi routes while keeping the route, network, and transaction details visible." highlights={["Baltex DeFi routes", "On-chain swaps", "Clear route flow"]} tone="blue" flipped />
              <PanelDivider />
              <ServicePanel secure panelImage="/images/non_custodial.png" icon={<LockKeyhole size={24} />} eyebrow="Your wallet, your control" title="Non-custodial platform" text="DirectSwapX never asks for seed phrases or private keys. You review and authorize every wallet transaction yourself." highlights={["No custody transfer", "No account required", "Private keys stay private"]} tone="purple" />
            </div>
          </section>
        </section>
      </main>

      <Footer />
    </div>
  );
}

function ServicePanel({
  icon,
  eyebrow,
  title,
  text,
  highlights,
  tone,
  flipped = false,
  featured = false,
  partners = false,
  product = false,
  fast = false,
  secure = false,
  panelImage,
  textOnly = false,
}: {
  icon: React.ReactNode;
  eyebrow: string;
  title: string;
  text: string;
  highlights: string[];
  tone: "violet" | "cyan" | "emerald" | "blue" | "purple";
  flipped?: boolean;
  featured?: boolean;
  partners?: boolean;
  product?: boolean;
  fast?: boolean;
  secure?: boolean;
  panelImage?: string;
  textOnly?: boolean;
}) {
  const toneIcon = {
    violet: "bg-violet-500/12 text-violet-100 border-violet-400/20",
    cyan: "bg-cyan-500/12 text-cyan-100 border-cyan-400/20",
    emerald: "bg-emerald-500/12 text-emerald-100 border-emerald-400/20",
    blue: "bg-blue-500/12 text-blue-100 border-blue-400/20",
    purple: "bg-purple-500/12 text-purple-100 border-purple-400/20",
  }[tone];

  const cardBase =
    "overflow-hidden rounded-[24px] border border-white/[0.055] bg-transparent";

  if (partners) {
    return (
      <article className={cardBase}>
        <div className="px-7 pb-5 pt-8 text-center sm:px-10">
          <p className="text-[12px] font-bold uppercase tracking-[0.16em] text-[#7FA2E8]">
            Our partners
          </p>
          <h3 className="mt-2 text-[26px] font-black tracking-tight text-white sm:text-[30px]">
            Connected routes. One clear swap flow.
          </h3>
        </div>

        <div className="flex min-h-[146px] flex-wrap items-center justify-center gap-0 px-4 py-5 sm:px-7">
          <PartnerWordMark label="Baltex" image="https://baltex.io/favicon.ico" />
          <PartnerWordMark label="KyberSwap" image="https://kyberswap.com/favicon.ico" />
          <PartnerWordMark label="OpenOcean" image="https://docs.openocean.finance/logo.avif" />
          <PartnerWordMark label="Godex" image="https://godex.io/favicon.ico" />
          <PartnerWordMark label="SimpleSwap" image="https://simpleswap.io/favicon.ico" />
          <PartnerWordMark label="LetsExchange" image="https://www.google.com/s2/favicons?domain=letsexchange.io&sz=128" />
          <PartnerWordMark label="ChangeNOW" image="https://changenow.io/favicon.ico" />
        </div>
      </article>
    );
  }

  if (textOnly) {
    const serviceDetails = [
      "Available pairs are checked before you continue, so unavailable routes do not make it into your swap flow.",
      "Deposit limits and route requirements are shown before review, helping you make informed decisions.",
      "Quotes refresh from your selected amount and expose expiry details when the active provider returns them.",
    ];

    return (
      <section className="">
        <div className="mx-auto max-w-[760px] text-center">
          <div className="flex items-center justify-center gap-2 text-violet-200">
            <span className="h-px w-10 bg-violet-300/40" />
            <span className="text-[12px] font-bold uppercase tracking-[0.18em] text-violet-200/70">
              {eyebrow}
            </span>
            <span className="h-px w-10 bg-violet-300/40" />
          </div>

          <h3 className="mt-4 text-[38px] font-black tracking-[-0.035em] text-white sm:text-[52px]">
            {title}
          </h3>

          <p className="mx-auto mt-4 max-w-[580px] text-[16px] font-medium leading-7 text-[#B6C0D7]">
            {text}
          </p>
        </div>

        <div className="mt-10 grid gap-5 lg:grid-cols-3">
          {highlights.map((highlight, index) => (
            <div
              key={highlight}
              className="group relative overflow-hidden rounded-[20px] border border-white/[0.075] bg-transparent p-7 transition duration-300 hover:-translate-y-1 hover:border-violet-300/20 sm:p-8"
            >
              <div className="flex items-center justify-between [&>span]:hidden">
                <span className="!inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.14em] text-emerald-200">
                  <BadgeCheck size={15} />
                  Checked
                </span>
                <span className="!block text-[12px] font-black text-white/25">0{index + 1}</span>
                <span>✦</span>
                <span>✦</span>
                <span>✦</span>
                <span>✦</span>
                <span>✦</span>
              </div>

              <p className="mt-6 min-h-[84px] text-[15px] font-medium leading-6 text-[#C8D1E3]">
                {serviceDetails[index]}
              </p>

              <div className="mt-8 flex items-center gap-3 border-t border-white/[0.06] pt-5">
                <span className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-violet-500/10 text-violet-100">
                  {icon}
                </span>

                <div>
                  <p className="text-[14px] font-black text-white">
                    {highlight}
                  </p>
                  <p className="mt-0.5 text-[12px] font-medium text-white/45">
                    Built into each route
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  return (
    <article className={cardBase}>
      <div
        className={`grid min-h-[320px] items-stretch ${
          textOnly ? "" : "lg:grid-cols-2"
        } ${flipped ? "lg:[&>div:first-child]:order-2" : ""}`}
      >
        <div className="flex flex-col justify-center p-7 sm:p-10 lg:p-12">
          {featured && (
            <span className="mb-5 w-fit rounded-full border border-violet-400/20 bg-violet-500/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.14em] text-violet-100">
              Built for live routing
            </span>
          )}

          <div className={`flex h-12 w-12 items-center justify-center rounded-[13px] ${toneIcon}`}>
            {icon}
          </div>

          <p className="mt-7 text-[12px] font-bold uppercase tracking-[0.16em] text-white/50">
            {eyebrow}
          </p>

          <h3 className="mt-3 text-[34px] font-black tracking-tight text-white sm:text-[42px]">
            {title}
          </h3>

          <p className="mt-4 max-w-[540px] text-[16px] font-medium leading-7 text-[#C3C9DA]">
            {text}
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-y-3">
            {highlights.map((highlight, index) => (
              <div
                key={highlight}
                className={`inline-flex items-center px-4 py-1 text-[13px] font-bold text-white/85 ${
                  index > 0 ? "border-l border-white/[0.12]" : "pl-0"
                } ${
                  featured && index === 0
                    ? "text-violet-100"
                    : ""
                }`}
              >
                {highlight}
              </div>
            ))}
          </div>
        </div>

        {!textOnly && (
          <div className="relative min-h-[230px] overflow-hidden bg-transparent">
            {panelImage ? (
              <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
                <img
                  src={panelImage}
                  alt=""
                  aria-hidden="true"
                  className="relative z-10 h-[83%] w-[83%] object-contain opacity-95 drop-shadow-[0_20px_30px_rgba(0,0,0,0.28)]"
                />
              </div>
            ) : secure ? (
              <div className="absolute inset-0 overflow-hidden">
                <div className="absolute left-1/2 top-1/2 h-[240px] w-[240px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-violet-300/12" />

                <div className="absolute left-1/2 top-1/2 flex h-[132px] w-[132px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-[30px] border border-violet-300/20 bg-[#10182E]">
                  <div className="flex h-[86px] w-[86px] items-center justify-center rounded-[24px] border border-white/10 bg-violet-500/10">
                    <LockKeyhole size={40} className="text-violet-100" />
                  </div>
                </div>

                <div className="absolute left-1/2 top-[17%] -translate-x-1/2 rounded-full border border-violet-300/20 bg-violet-500/10 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.13em] text-violet-100">
                  Self-custody
                </div>

                <div className="absolute bottom-[15%] left-1/2 flex -translate-x-1/2 items-center gap-2 whitespace-nowrap text-[12px] font-bold text-white/65">
                  <span className="h-2 w-2 rounded-full bg-emerald-300" />
                  Wallet control stays with you
                </div>
              </div>
            ) : fast ? (
              <div className="absolute inset-0 overflow-hidden bg-[#071026]">
                <img
                  src="/images/fast-exchange-engine.png"
                  alt="Fast crypto exchange engine"
                  className="h-full w-full object-cover object-center"
                />

                <div className="absolute inset-0 bg-[#071026]/20" />

                <div className="absolute left-6 top-6 rounded-full border border-cyan-200/25 bg-[#071026]/80 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.13em] text-cyan-100">
                  Fast exchange
                </div>

                <div className="absolute bottom-6 right-6 flex items-center gap-2 rounded-full border border-white/15 bg-[#071026]/80 px-3 py-2 text-[11px] font-bold text-white/75">
                  <span className="h-2 w-2 rounded-full bg-emerald-300" />
                  Live route response
                </div>
              </div>
            ) : product ? (
              <div className="absolute inset-0 bg-[#071026]">
                <img
                  src="/images/defi-route-engine.png"
                  alt="Abstract DeFi route engine"
                  className="h-full w-full object-cover object-center"
                />

                <div className="absolute inset-0 bg-[#071026]/20" />

                <div className="absolute left-6 top-6 rounded-full border border-cyan-200/30 bg-[#071026]/80 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.13em] text-cyan-100">
                  On-chain route engine
                </div>

                <div className="absolute bottom-6 right-6 rounded-[12px] border border-white/15 bg-[#071026]/80 px-4 py-3">
                  <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-white/45">
                    Wallet-first execution
                  </p>
                  <p className="mt-1 text-[14px] font-black text-white">
                    Review. Sign. Swap.
                  </p>
                </div>
              </div>
            ) : featured ? (
              <div className="absolute inset-0">
                <div className="absolute left-1/2 top-1/2 h-[300px] w-[300px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-violet-300/10" />

                <div className="absolute left-[18%] top-[24%] h-px w-[56%] rotate-[24deg] bg-cyan-200/40" />
                <div className="absolute left-[22%] top-[66%] h-px w-[52%] -rotate-[30deg] bg-violet-200/40" />

                <RouteNode className="left-[18%] top-[27%]" label="Route A" />
                <RouteNode className="right-[17%] top-[42%]" label="Route B" />
                <RouteNode className="bottom-[18%] left-[39%]" label="Verified" active />

                <div className="absolute left-1/2 top-1/2 flex h-[104px] w-[104px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-[26px] border border-violet-300/20 bg-[#10182E]">
                  <BadgeCheck size={38} className="text-violet-100" />
                </div>

                <div className="absolute left-1/2 top-[18%] -translate-x-1/2 rounded-full border border-emerald-300/25 bg-emerald-300/10 px-3 py-1 text-[11px] font-black tracking-[0.12em] text-emerald-100">
                  LIVE ROUTE
                </div>

                <div className="absolute bottom-[9%] left-1/2 flex -translate-x-1/2 gap-2 whitespace-nowrap text-[11px] font-bold text-white/60">
                  <span className="h-2 w-2 rounded-full bg-emerald-300" />
                  Provider checks active
                </div>
              </div>
            ) : (
              <>
                <div className="absolute left-1/2 top-1/2 h-[240px] w-[240px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/12 bg-white/[0.025]" />

                <div className="absolute left-1/2 top-1/2 h-[160px] w-[160px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/12 bg-[#10182E]">
                  <div className="flex h-full items-center justify-center text-white/85">
                    {icon}
                  </div>
                </div>

                <div className="absolute left-[12%] top-[20%] h-2 w-2 rounded-full bg-white/70" />
                <div className="absolute bottom-[20%] right-[16%] h-3 w-3 rounded-full bg-white/50" />

                <div className="absolute bottom-[12%] left-[17%] rounded-full border border-white/15 bg-[#10182E] px-4 py-2 text-[12px] font-bold text-white/80">
                  DirectSwapX
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </article>
  );
}

function PanelDivider() {
  return <div className="h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />;
}

function PartnerWordMark({ label, image, letter }: { label: string; image?: string; letter?: string }) {
  return (
    <div className="group flex h-[72px] items-center gap-3 px-5 opacity-75 transition hover:opacity-100">
      {image ? <img src={image} alt={`${label} logo`} className="h-9 w-9 rounded-[9px] object-contain" /> : <span className="flex h-9 w-9 items-center justify-center rounded-[9px] bg-gradient-to-br from-[#5EEBFF] to-[#6657F6] text-[17px] font-black text-[#071026]">{letter}</span>}
      <span className="text-[17px] font-black tracking-[0.02em] text-white/90 transition group-hover:text-white">{label}</span>
    </div>
  );
}

function RouteNode({ className, label, active = false }: { className: string; label: string; active?: boolean }) {
  return <div className={`absolute ${className} rounded-full border px-3 py-2 text-[11px] font-black ${active ? "border-emerald-300/35 bg-emerald-300/15 text-emerald-100" : "border-white/15 bg-[#111936]/90 text-white/75"}`}><span className={`mr-1.5 inline-block h-1.5 w-1.5 rounded-full ${active ? "bg-emerald-300" : "bg-cyan-200"}`} />{label}</div>;
}

function FeatureTile({
  icon,
  index,
  title,
  text,
}: {
  icon: React.ReactNode;
  index: string;
  title: string;
  text: string;
}) {
  return (
    <div className="group min-h-[132px]">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-[9px] bg-[#7E52FF]/[0.08] text-[#A47CFF] transition group-hover:bg-[#7E52FF]/[0.16]">
          {icon}
        </div>
        <span className="text-[12px] font-black text-white/20">{index}</span>
      </div>
      <h3 className="text-[16px] font-black leading-tight text-white">
        {title}
      </h3>
      <p className="mt-2 text-[13px] font-medium leading-5 text-[#8F9AB5]">
        {text}
      </p>
    </div>
  );
}
