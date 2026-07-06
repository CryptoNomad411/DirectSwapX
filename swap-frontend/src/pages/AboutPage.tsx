import { Link } from "react-router-dom";
import {
  ArrowRight,
  BadgePercent,
  Eye,
  ShieldCheck,
  Zap,
} from "lucide-react";

import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

const reasons = [
  {
    icon: <ShieldCheck size={24} />,
    index: "01",
    title: "Non-custodial",
    text: "You stay in control. We never ask you to hand over your funds.",
  },
  {
    icon: <Eye size={24} />,
    index: "02",
    title: "Clear review",
    text: "Routes, limits, amounts, and rate mode stay visible before you send.",
  },
  {
    icon: <Zap size={24} />,
    index: "03",
    title: "Fast flow",
    text: "Move from pair selection to quote review without account friction.",
  },
  {
    icon: <BadgePercent size={24} />,
    index: "04",
    title: "Transparent rates",
    text: "Fixed and floating modes are easy to compare before committing.",
  },
];

const teamMembers = [
  { label: "UX", tone: "from-[#7E52FF] to-[#477CFF]" },
  { label: "API", tone: "from-[#24D3FF] to-[#477CFF]" },
  { label: "OPS", tone: "from-[#A47CFF] to-[#7E52FF]" },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen overflow-hidden bg-[#030817] text-white">
      <Navbar />

      <main className="relative border-b border-white/10">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_72%_36%,rgba(73,93,255,0.15),transparent_32%),linear-gradient(180deg,rgba(3,8,23,0)_0%,rgba(3,8,23,0.96)_100%)]" />
        <div className="pointer-events-none absolute right-[14%] top-[150px] h-[420px] w-[720px] rotate-[9deg] rounded-[50%] border border-indigo-300/[0.035]" />

        <section className="relative z-10 mx-auto max-w-[1600px] px-5 pb-12 pt-8 sm:px-8 sm:pb-14 sm:pt-8 lg:px-[90px] lg:pt-[24px]">
          <div className="grid gap-8 lg:grid-cols-[0.84fr_1.16fr] lg:items-center">
            <div>
              <h1 className="mt-[30px] max-w-[760px] text-[38px] font-black leading-[1.06] tracking-normal text-white sm:text-[58px] lg:text-[68px]">
                About&nbsp;
                <span className="bg-gradient-to-r from-[#9F61FF] to-[#477CFF] bg-clip-text text-transparent">
                  DirectSwapX
                </span>
              </h1>

              <p className="mt-[22px] max-w-[650px] text-[18px] font-medium leading-[1.55] text-[#A9B2C9] sm:text-[20px]">
                We are building a faster, clearer way to swap crypto across
                leading blockchains without accounts, custody, or confusing
                steps. The focus is simple: help users understand the swap
                before funds move.
              </p>

              <div className="mt-[30px] flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:gap-8">
                <Link
                  to="/"
                  className="inline-flex h-[52px] w-full items-center justify-center gap-4 rounded-[8px] bg-gradient-to-r from-[#7B3FF2] to-[#477CFF] text-[16px] font-bold text-white shadow-[0_16px_42px_rgba(75,106,255,0.28)] transition hover:translate-y-[-1px] sm:w-[224px]"
                >
                  Start a swap
                  <ArrowRight size={23} />
                </Link>

                <Link
                  to="/how-it-works"
                  className="inline-flex h-[52px] items-center justify-center text-[16px] font-semibold text-[#A9B2C9] transition hover:text-white sm:justify-start"
                >
                  How it works
                </Link>
              </div>
            </div>

            <div className="relative overflow-hidden lg:overflow-visible">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute left-1/2 top-1/2 h-[350px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(126,82,255,0.2)_0%,rgba(71,124,255,0.13)_42%,rgba(36,211,255,0.055)_62%,transparent_78%)] opacity-80 blur-[42px] sm:h-[470px] sm:w-[680px] lg:h-[620px] lg:w-[900px]"
              />
              <div
                aria-hidden="true"
                className="pointer-events-none absolute left-[51%] top-[53%] h-[190px] w-[390px] -translate-x-1/2 -translate-y-1/2 rotate-[7deg] rounded-[50%] border border-[#7E52FF]/10 sm:h-[260px] sm:w-[590px] lg:h-[340px] lg:w-[780px]"
              />
              <img
                src="/images/about_brand.png"
                alt="DirectSwapX network"
                className="absolute left-1/2 top-1/2 z-10 h-[300px] max-w-none -translate-x-1/2 -translate-y-1/2 select-none object-contain opacity-95 shadow-none [backface-visibility:hidden] [filter:drop-shadow(0_28px_80px_rgba(71,124,255,0.18))] [image-rendering:auto] [mask-image:radial-gradient(ellipse_at_center,black_58%,rgba(0,0,0,0.94)_72%,transparent_94%)] sm:w-[760px] lg:w-[920px] xl:w-[1020px]"
              />
            </div>
          </div>

          <div className="mt-12">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <p className="text-[24px] font-bold tracking-[0.14em]">
                  Why Direct?
                </p>
            </div>

            <div className="mt-3 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
              {reasons.map((item) => (
                <ReasonTile
                  key={item.title}
                  icon={item.icon}
                  index={item.index}
                  title={item.title}
                  text={item.text}
                />
              ))}
            </div>
          </div>

          <section className="mt-10 grid gap-5 xl:grid-cols-2">
            <div className="rounded-[16px] border border-white/[0.08] bg-[#070D1F]/70 p-5 shadow-[0_22px_70px_rgba(0,0,0,0.22)] sm:p-7">
              <div className="grid gap-7 md:grid-cols-[220px_1fr] md:items-start">
                <div className="relative overflow-hidden rounded-[14px] border border-white/[0.08] bg-[#0B1228] p-4">
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_42%,rgba(71,124,255,0.18),transparent_58%)]"
                  />
                  <img
                    src="/images/about_story.png"
                    alt="DirectSwapX mission"
                    className="relative z-10 aspect-square w-full rounded-[10px] object-cover opacity-95 mix-blend-screen"
                  />
                </div>

                <div>
                  <h2 className="text-[26px] font-black leading-tight text-white">
                    Our mission
                  </h2>
                  <p className="mt-4 text-[16px] font-medium leading-7 text-[#A9B2C9]">
                    DirectSwapX was built to solve the common pain points of
                    crypto swaps: confusing routes, unclear limits, account
                    friction, and custody concerns.
                  </p>
                  <p className="mt-4 text-[16px] font-medium leading-7 text-[#A9B2C9]">
                    We focus on practical tools that make self-custody swaps
                    easier to understand, easier to review, and easier to
                    complete.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-[16px] border border-white/[0.08] bg-[#070D1F]/70 p-5 shadow-[0_22px_70px_rgba(0,0,0,0.22)] sm:p-7">
              <div className="flex min-h-full flex-col">
                <h2 className="mt-6 text-[26px] font-black leading-tight text-white">
                  About team
                </h2>

                <p className="mt-5 max-w-[660px] text-[16px] font-medium leading-7 text-[#A9B2C9]">
                  A focused group of product builders, frontend engineers, API
                  integrators, and blockchain specialists dedicated to making
                  crypto swapping cleaner and more reliable.
                </p>

                <div className="mt-auto flex flex-col gap-5 pt-5 sm:flex-row sm:items-center sm:justify-between">
                  <Link
                    to="/support"
                    className="inline-flex items-center gap-2 text-[16px] font-bold text-[#7FA2E8] transition hover:text-white"
                  >
                    Contact the team
                    <ArrowRight size={18} />
                  </Link>

                  <div className="flex items-center">
                    {teamMembers.map((member, index) => (
                      <div
                        key={member.label}
                        className={`relative flex h-[54px] w-[54px] items-center justify-center rounded-full border-2 border-[#070D1F] bg-gradient-to-br ${member.tone} text-[13px] font-black text-white shadow-[0_12px_32px_rgba(0,0,0,0.28)]`}
                        style={{ marginLeft: index === 0 ? 0 : -12 }}
                      >
                        {member.label}
                      </div>
                    ))}
                    <div className="-ml-3 flex h-[54px] w-[54px] items-center justify-center rounded-full border-2 border-[#070D1F] bg-[#111832] text-[15px] font-black text-[#C7B9FF] shadow-[0_12px_32px_rgba(0,0,0,0.28)]">
                      +6
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </section>
      </main>

      <Footer />
    </div>
  );
}

function ReasonTile({
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
    <div className="group min-h-[150px] rounded-[8px] border border-white/[0.07] bg-white/[0.035] p-6 shadow-[0_18px_60px_rgba(0,0,0,0.18)] transition hover:border-[#7E52FF]/25 hover:bg-white/[0.05]">
      <div className="mb-5 flex items-center justify-between gap-4">
        <div className="flex h-[52px] w-[52px] items-center justify-center rounded-full border border-[#7E52FF]/35 bg-[#7E52FF]/[0.12] text-[#A47CFF] transition group-hover:border-[#7E52FF]/55 group-hover:bg-[#7E52FF]/[0.16]">
          {icon}
        </div>
        <span className="text-[12px] font-black text-white/20">{index}</span>
      </div>
      <h3 className="text-[17px] font-black leading-tight text-white">
        {title}
      </h3>
      <p className="mt-3 text-[14px] font-medium leading-6 text-[#8F9AB5]">
        {text}
      </p>
    </div>
  );
}
