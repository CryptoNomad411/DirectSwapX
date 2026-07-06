import type { ReactNode } from "react";

import Footer from "./Footer";
import Navbar from "./Navbar";

type Highlight = {
  icon: ReactNode;
  text: string;
};

type PolicySection = {
  title: string;
  body: ReactNode;
};

type Feature = {
  icon: ReactNode;
  title: string;
  text: string;
};

type LegalPageLayoutProps = {
  eyebrow: string;
  title: string;
  accent: string;
  intro: string;
  updated: string;
  heroIcon: ReactNode;
  heroTitle: string;
  heroText: string;
  summaryTitle: string;
  highlights: Highlight[];
  sections: PolicySection[];
  features: Feature[];
};

export default function LegalPageLayout({
  eyebrow,
  title,
  accent,
  intro,
  updated,
  heroIcon,
  heroTitle,
  heroText,
  summaryTitle,
  highlights,
  sections,
  features,
}: LegalPageLayoutProps) {
  return (
    <div className="min-h-screen overflow-hidden bg-[#030817] text-white">
      <Navbar />

      <main className="relative border-b border-white/10">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_74%_18%,rgba(73,93,255,0.16),transparent_42%),radial-gradient(circle_at_18%_38%,rgba(126,82,255,0.1),transparent_34%),linear-gradient(180deg,rgba(3,8,23,0)_0%,rgba(3,8,23,0.95)_100%)]" />
        <div className="pointer-events-none absolute right-[9%] top-[120px] h-[470px] w-[720px] rotate-[9deg] rounded-[50%] border border-indigo-300/[0.035]" />

        <section className="relative z-10 mx-auto max-w-[1600px] px-5 py-8 sm:px-8 sm:py-12 lg:px-[90px] lg:py-[70px]">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-stretch">
            <section className="rounded-[18px] border border-white/10 bg-[#090F22]/92 p-6 shadow-[0_32px_110px_rgba(0,0,0,0.36)] backdrop-blur-xl sm:p-8 lg:p-10">
              <div className="inline-flex min-h-10 items-center gap-2 rounded-[10px] border border-[#7E52FF] bg-[#7E52FF]/10 px-5 py-2 text-[14px] font-semibold text-[#C7B9FF]">
                {heroIcon}
                <span>{eyebrow}</span>
              </div>

              <h1 className="mt-7 max-w-[760px] text-[42px] font-black leading-[1.08] tracking-normal text-white sm:text-[52px] lg:text-[60px]">
                {title}{" "}
                <span className="bg-gradient-to-r from-[#9F61FF] to-[#477CFF] bg-clip-text text-transparent">
                  {accent}
                </span>
              </h1>

              <p className="mt-5 max-w-[780px] text-[17px] font-medium leading-[1.65] text-[#A9B2C9] sm:text-[19px]">
                {intro}
              </p>

              <p className="mt-5 text-[13px] font-bold uppercase tracking-[0.14em] text-[#7FA2E8]">
                Last updated: {updated}
              </p>
            </section>

            <aside className="rounded-[18px] border border-white/10 bg-[#090F22]/80 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.24)] backdrop-blur-xl">
              <div className="flex h-16 w-16 items-center justify-center rounded-[14px] border border-[#7E52FF]/30 bg-[#7E52FF]/[0.08] text-[#A47CFF]">
                {heroIcon}
              </div>

              <h2 className="mt-6 text-[23px] font-black leading-tight text-white">
                {heroTitle}
              </h2>

              <p className="mt-3 text-[14px] font-medium leading-6 text-[#8F9AB5]">
                {heroText}
              </p>
            </aside>
          </div>

          <div className="mt-8 grid gap-8 lg:grid-cols-[330px_minmax(0,1fr)]">
            <aside className="h-fit border-y border-white/[0.07] py-6 lg:sticky lg:top-8">
              <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-[#7FA2E8]">
                {summaryTitle}
              </p>

              <div className="mt-5 grid gap-5">
                {highlights.map((item) => (
                  <div key={item.text} className="flex items-start gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] border border-[#7E52FF]/30 bg-[#7E52FF]/[0.08] text-[#A47CFF]">
                      {item.icon}
                    </div>
                    <p className="text-[14px] font-semibold leading-6 text-[#A9B2C9]">
                      {item.text}
                    </p>
                  </div>
                ))}
              </div>
            </aside>

            <article className="rounded-[18px] border border-white/10 bg-[#090F22]/88 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.24)] backdrop-blur-xl sm:p-8 lg:p-10">
              {sections.map((section) => (
                <PolicyBlock key={section.title} title={section.title}>
                  {section.body}
                </PolicyBlock>
              ))}
            </article>
          </div>

          <section className="mt-8 border-y border-white/[0.07] py-6">
            <div className="grid gap-6 md:grid-cols-3">
              {features.map((feature) => (
                <div key={feature.title} className="min-h-[132px]">
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-[10px] border border-[#7E52FF]/30 bg-[#7E52FF]/[0.08] text-[#A47CFF]">
                    {feature.icon}
                  </div>
                  <h3 className="text-[17px] font-black leading-tight text-white">
                    {feature.title}
                  </h3>
                  <p className="mt-2 text-[13px] font-medium leading-5 text-[#8F9AB5]">
                    {feature.text}
                  </p>
                </div>
              ))}
            </div>
          </section>
        </section>
      </main>

      <Footer />
    </div>
  );
}

function PolicyBlock({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="border-b border-white/[0.07] py-7 first:pt-0 last:border-b-0 last:pb-0">
      <h2 className="text-[22px] font-black leading-tight text-white">
        {title}
      </h2>
      <div className="mt-3 text-[15px] font-medium leading-7 text-[#A9B2C9] sm:text-[16px] sm:leading-8">
        {children}
      </div>
    </section>
  );
}
