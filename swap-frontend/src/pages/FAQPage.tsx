import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Headphones,
  Minus,
  Plus,
} from "lucide-react";

import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

const faqs = [
  {
    question: "What is DirectSwapX?",
    answer:
      "DirectSwapX is a non-custodial cryptocurrency swap platform that helps you exchange assets across supported blockchains without creating an account or handing over wallet custody.",
  },
  {
    question: "Do I need to create an account?",
    answer:
      "No. You can review a quote and start a swap without a profile, password, or account dashboard. You only need the sending asset and a valid receiving wallet address.",
  },
  {
    question: "Is DirectSwapX safe to use?",
    answer:
      "DirectSwapX is designed around self-custody. We never ask for seed phrases, private keys, or wallet passwords. Always check the selected network, wallet address, and amount before sending funds.",
  },
  {
    question: "What cryptocurrencies can I swap?",
    answer:
      "Available pairs depend on supported assets, networks, route liquidity, and maintenance status. The swap form filters available pairs before showing a quote.",
  },
  {
    question: "How long does a swap take?",
    answer:
      "Most swaps begin processing after your deposit is confirmed on-chain. Completion time depends on the selected network, confirmation requirements, congestion, and route availability.",
  },
  {
    question: "What are the fees?",
    answer:
      "The quote reflects the estimated route and network costs before you continue. Blockchain network fees can change depending on congestion, especially for floating-rate swaps.",
  },
  {
    question: "Which blockchains are supported?",
    answer:
      "Supported networks vary by asset and liquidity route. Choose the asset pair in the swap card to see whether the route is currently available.",
  },
  {
    question: "What if my transaction is taking too long?",
    answer:
      "First check whether your deposit has enough confirmations. If it is confirmed but the swap has not progressed, contact support with your exchange ID and transaction hash.",
  },
];

export default function FAQPage() {
  const [openItem, setOpenItem] = useState(-1);

  return (
    <div className="min-h-screen overflow-hidden bg-[#030817] text-white">
      <Navbar />

      <main className="relative border-b border-white/10">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_74%_40%,rgba(73,93,255,0.14),transparent_32%),linear-gradient(180deg,rgba(3,8,23,0)_0%,rgba(3,8,23,0.96)_100%)]" />
        <div className="pointer-events-none absolute right-[14%] top-[150px] h-[420px] w-[720px] rotate-[9deg] rounded-[50%] border border-indigo-300/[0.035]" />

        <section className="relative z-10 mx-auto grid max-w-[1480px] gap-10 px-5 pb-12 pt-8 sm:px-8 sm:pb-14 sm:pt-12 lg:grid-cols-[minmax(300px,480px)_minmax(620px,840px)] lg:justify-between lg:gap-14 lg:px-[90px] lg:pt-[76px]">
          <div className="lg:pt-5">
            <h1 className="max-w-[640px] text-[40px] font-black leading-[1.08] tracking-normal text-white sm:text-[48px] lg:text-[56px]">
              Frequently asked
              <span className="block bg-gradient-to-r from-[#9F61FF] to-[#477CFF] bg-clip-text text-transparent">
                questions.
              </span>
            </h1>

            <p className="mt-[22px] max-w-[520px] text-[18px] font-medium leading-[1.55] text-[#A9B2C9] sm:text-[20px]">
              Everything you need to know about DirectSwapX. Need more help?
              Reach out to our support team anytime.
            </p>

            <Link
              to="/support"
              className="mt-8 flex max-w-[350px] items-center gap-5 rounded-[8px] border border-[#7E52FF]/25 bg-[#7E52FF]/[0.07] px-5 py-5 shadow-[0_18px_60px_rgba(0,0,0,0.18)] transition hover:border-[#7E52FF]/45 hover:bg-[#7E52FF]/[0.11]"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-[#7E52FF]/35 bg-[#7E52FF]/10 text-[#C7B9FF]">
                <Headphones size={24} />
              </div>
              <div className="min-w-0">
                <p className="text-[15px] font-black text-white">
                  Still have questions?
                </p>
                <p className="mt-1 flex items-center gap-2 text-[16px] font-bold text-[#A47CFF]">
                  Contact Support
                  <ArrowRight size={18} />
                </p>
              </div>
            </Link>
          </div>

          <div className="relative">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute left-1/2 top-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(126,82,255,0.13)_0%,rgba(71,124,255,0.07)_45%,transparent_72%)] opacity-70 blur-[34px]"
            />

            <div className="relative z-10 overflow-hidden rounded-[12px] border border-white/[0.07] bg-[#070D1F]/70 shadow-[0_24px_80px_rgba(0,0,0,0.24)]">
              {faqs.map((faq, index) => {
                const isOpen = openItem === index;

                return (
                  <div
                    key={faq.question}
                    className={`border-b border-white/[0.07] last:border-b-0 ${
                      isOpen ? "bg-[#0C1430]/86" : "bg-[#070D1F]/40"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setOpenItem(isOpen ? -1 : index)}
                      aria-expanded={isOpen}
                      className="flex w-full items-center justify-between gap-5 px-5 py-[19px] text-left transition hover:bg-white/[0.025] sm:px-7"
                    >
                      <span
                        className={`text-[17px] font-black leading-6 ${
                          isOpen ? "text-[#BBA8FF]" : "text-white"
                        }`}
                      >
                        {faq.question}
                      </span>

                      <span
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition ${
                          isOpen
                            ? "border-[#7E52FF]/70 text-[#C7B9FF]"
                            : "border-white/25 text-[#B8C1D6]"
                        }`}
                      >
                        {isOpen ? <Minus size={18} /> : <Plus size={18} />}
                      </span>
                    </button>

                    {isOpen && (
                      <div className="px-5 pb-6 pt-0 sm:px-7">
                        <p className="max-w-[760px] text-[15px] font-medium leading-7 text-[#A9B2C9]">
                          {faq.answer}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
