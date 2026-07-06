import { useState } from "react";
import { Link } from "react-router-dom";
import {
  BadgePercent,
  Check,
  PlayCircle,
  Send,
  Wallet,
} from "lucide-react";

import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

const steps = [
  {
    number: "1",
    icon: <Wallet size={25} />,
    title: "Choose currencies",
    text: "Select the crypto you want to swap from and the one you want to receive.",
  },
  {
    number: "2",
    icon: <BadgePercent size={25} />,
    title: "Enter amount",
    text: "Input the amount you want to swap and review the estimated output.",
  },
  {
    number: "3",
    icon: <Send size={25} />,
    title: "Send crypto",
    text: "Send your crypto to the generated wallet address on the selected network.",
  },
  {
    number: "4",
    icon: <Check size={25} />,
    title: "Receive funds",
    text: "Once confirmed on-chain, your swapped crypto is sent directly to your wallet.",
  },
];

const checklist = [
  {
    title: "Check network",
    text: "Make sure the selected chain matches your sending wallet.",
  },
  {
    title: "Verify address",
    text: "Confirm the receiving wallet before you create the exchange.",
  },
  {
    title: "Save exchange ID",
    text: "Keep it handy until the swap is completed.",
  },
  {
    title: "Wait for confirmations",
    text: "Processing starts after the deposit is confirmed on-chain.",
  },
];

export default function HowItWorksPage() {
  const [activeStep, setActiveStep] = useState(0);

  function handlePreviewSteps() {
    setActiveStep((current) => (current + 1) % steps.length);
  }

  return (
    <div className="min-h-screen overflow-hidden bg-[#030817] text-white">
      <Navbar />

      <main className="relative border-b border-white/10">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_72%_36%,rgba(73,93,255,0.16),transparent_32%),linear-gradient(180deg,rgba(3,8,23,0)_0%,rgba(3,8,23,0.96)_100%)]" />
        <div className="pointer-events-none absolute right-[14%] top-[150px] h-[420px] w-[720px] rotate-[9deg] rounded-[50%] border border-indigo-300/[0.035]" />

        <section className="relative z-10 mx-auto max-w-[1600px] px-5 pb-10 pt-8 sm:px-8 sm:pb-12 sm:pt-12 lg:px-[90px] lg:pt-[10px]">
          <div className="grid gap-5 lg:grid-cols-[0.86fr_1.14fr] lg:items-center">
            <div>
              <h1 className="max-w-[720px] text-[46px] font-black leading-[1.06] tracking-normal text-white sm:text-[58px] lg:text-[66px]">
                How It{" "}
                <span className="bg-gradient-to-r from-[#9F61FF] to-[#477CFF] bg-clip-text text-transparent">
                  Works
                </span>
              </h1>

              <p className="mt-[22px] max-w-[520px] text-[18px] font-medium leading-[1.55] text-[#A9B2C9] sm:text-[20px]">
                DirectSwapX makes crypto swaps simple, fast, and secure. Swap
                across leading blockchains in just a few easy steps.
              </p>

              <div className="mt-[30px] flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:gap-8">
                <button
                  type="button"
                  onClick={handlePreviewSteps}
                  className="inline-flex h-[44px] w-full items-center justify-center gap-3 rounded-[9px] border border-[#7E52FF]/70 bg-[#7E52FF]/10 px-5 text-[15px] font-bold text-[#C7B9FF] transition hover:border-[#9F86FF] hover:bg-[#7E52FF]/15 hover:text-white sm:w-auto"
                >
                  <PlayCircle size={18} />
                  Preview steps
                </button>

                <Link
                  to="/"
                  className="inline-flex h-[44px] items-center justify-center text-[15px] font-bold text-[#A9B2C9] transition hover:text-white sm:justify-start"
                >
                  Start a swap
                </Link>
              </div>
            </div>

            <div className="relative hidden pt-5 pb-5 lg:block">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute  left-1/2 top-1/2 h-[620px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(126,82,255,0.18)_0%,rgba(71,124,255,0.10)_42%,rgba(36,211,255,0.05)_57%,transparent_72%)] opacity-70 blur-[34px]"
              />
              <img
                src="/images/how_it_works_brand.png"
                alt="DirectSwapX swap route"
                className="relative z-10 mx-auto w-full max-w-[800px] object-contain opacity-95"
              />
            </div>
          </div>

          <div className="relative mt-10 rounded-[14px] border border-white/[0.07] bg-[#070D1F]/48 p-4 shadow-[0_18px_60px_rgba(0,0,0,0.18)] lg:mt-4 lg:p-5">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute left-[10%] right-[10%] top-[43px] hidden h-px bg-gradient-to-r from-transparent via-[#7E52FF]/60 to-transparent xl:block"
            />
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
              {steps.map((step, index) => (
                <StepCard
                  key={step.title}
                  number={step.number}
                  icon={step.icon}
                  title={step.title}
                  text={step.text}
                  active={activeStep === index}
                  onClick={() => setActiveStep(index)}
                />
              ))}
            </div>
          </div>

          <div className="mt-6 border-y border-white/[0.07] py-5">
            <div className="grid gap-5 lg:grid-cols-[260px_1fr] lg:items-start">
              <div>
                <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-[#7FA2E8]">
                  Before you send
                </p>
                <h2 className="mt-2 max-w-[240px] text-[22px] font-black leading-tight text-white">
                  Quick final checks.
                </h2>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {checklist.map((item) => (
                  <ChecklistItem
                    key={item.title}
                    title={item.title}
                    text={item.text}
                  />
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

function ChecklistItem({ title, text }: { title: string; text: string }) {
  return (
    <div className="flex gap-3">
      <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[#7E52FF]/35 bg-[#7E52FF]/10 text-[#C7B9FF]">
        <Check size={14} />
      </div>
      <div>
        <h3 className="text-[15px] font-black leading-tight text-white">
          {title}
        </h3>
        <p className="mt-1 text-[13px] font-medium leading-5 text-[#8F9AB5]">
          {text}
        </p>
      </div>
    </div>
  );
}

function StepCard({
  number,
  icon,
  title,
  text,
  active,
  onClick,
}: {
  number: string;
  icon: React.ReactNode;
  title: string;
  text: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className="group relative pt-10 text-left"
    >
      <div
        className={`absolute left-1/2 top-0 z-10 flex h-12 w-12 -translate-x-1/2 items-center justify-center rounded-full border text-[20px] font-black transition ${
          active
            ? "border-[#8F6BFF]/80 bg-[#15123A] text-white shadow-[0_0_34px_rgba(126,82,255,0.45)]"
            : "border-white/10 bg-[#0B1024] text-[#BBA8FF] shadow-[0_0_26px_rgba(126,82,255,0.18)] group-hover:border-[#7E52FF]/45"
        }`}
      >
        {number}
      </div>
      <div
        className={`flex min-h-[162px] items-start gap-5 rounded-[10px] border p-5 shadow-[0_16px_48px_rgba(0,0,0,0.14)] transition ${
          active
            ? "border-[#7E52FF]/55 bg-[#101735]/88"
            : "border-white/[0.065] bg-[#090F22]/74 group-hover:border-[#7E52FF]/28 group-hover:bg-[#101735]/72"
        }`}
      >
        <div
          className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full border transition ${
            active
              ? "border-[#9F86FF]/60 bg-[#7E52FF]/[0.16] text-white"
              : "border-[#7E52FF]/35 bg-[#7E52FF]/[0.12] text-[#A47CFF]"
          }`}
        >
          {icon}
        </div>
        <div>
          <h3 className="text-[17px] font-black leading-tight text-white">
            {title}
          </h3>
          <p className="mt-3 text-[14px] font-medium leading-6 text-[#8F9AB5]">
            {text}
          </p>
        </div>
      </div>
    </button>
  );
}
