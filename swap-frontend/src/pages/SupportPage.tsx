import { Link } from "react-router-dom";
import {
  ArrowRight,
  BookOpen,
  Hash,
  Headphones,
  Mail,
  MessageSquare,
  Send,
  Wallet,
} from "lucide-react";

import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

const supportOptions = [
  {
    icon: <MessageSquare size={27} />,
    title: "Live Chat",
    text: "Chat with our support team in real time.",
    action: "Start Chat",
    href: "https://t.me/DirectSwapXOfficial",
  },
  {
    icon: <Mail size={27} />,
    title: "Email Support",
    text: "Send us an email and we will get back to you.",
    action: "hello@directswapx.com",
    href: "mailto:hello@directswapx.com",
  },
  {
    icon: <BookOpen size={27} />,
    title: "Help Center",
    text: "Browse common questions and swap guidance.",
    action: "Visit Help Center",
    href: "/faq",
  },
  {
    icon: <Send size={27} />,
    title: "Community",
    text: "Join our community for updates and help.",
    action: "Join Community",
    href: "https://x.com/DirectSwapXOfficial",
  },
];

const supportChecklist = [
  {
    icon: <Hash size={18} />,
    title: "Exchange ID",
    text: "The ID from your swap status page.",
  },
  {
    icon: <ArrowRight size={18} />,
    title: "Transaction hash",
    text: "The on-chain hash for your deposit.",
  },
  {
    icon: <Wallet size={18} />,
    title: "Receiving address",
    text: "The wallet address entered for delivery.",
  },
];

export default function SupportPage() {
  return (
    <div className="min-h-screen overflow-hidden bg-[#030817] text-white">
      <Navbar />

      <main className="relative border-b border-white/10">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_72%_40%,rgba(73,93,255,0.14),transparent_32%),linear-gradient(180deg,rgba(3,8,23,0)_0%,rgba(3,8,23,0.96)_100%)]" />
        <div className="pointer-events-none absolute right-[14%] top-[150px] h-[420px] w-[720px] rotate-[9deg] rounded-[50%] border border-indigo-300/[0.035]" />

        <section className="relative z-10 mx-auto max-w-[1600px] px-5 pb-12 sm:px-8 sm:pb-14  lg:px-[90px] ">
          <div className="grid gap-8 lg:grid-cols-[0.74fr_1.26fr] lg:items-center">
            <div>
              <div className="inline-flex min-h-10 flex-wrap items-center gap-2 rounded-[10px] border border-[#7E52FF]/80 bg-[#7E52FF]/10 px-5 py-2 text-[14px] font-semibold text-[#C7B9FF]">
                <Headphones size={17} />
                <span>Support Center</span>
              </div>

              <h1 className="mt-[30px] max-w-[560px] text-[44px] font-black leading-[1.08] tracking-normal text-white sm:text-[58px] lg:text-[66px]">
                We're here
                <span className="block">
                  to{" "}
                  <span className="bg-gradient-to-r from-[#9F61FF] to-[#477CFF] bg-clip-text text-transparent">
                    help.
                  </span>
                </span>
              </h1>

              <p className="mt-[22px] max-w-[430px] text-[18px] font-medium leading-[1.55] text-[#A9B2C9] sm:text-[20px]">
                Have a question or need assistance? Our support team is ready
                to help you 24/7.
              </p>
            </div>

            <div className="relative min-h-[280px] overflow-hidden sm:min-h-[360px] lg:min-h-[500px] lg:overflow-visible">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute left-1/2 top-1/2 h-[360px] w-[460px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(126,82,255,0.18)_0%,rgba(71,124,255,0.11)_42%,rgba(36,211,255,0.05)_58%,transparent_72%)] opacity-75 blur-[34px] sm:h-[470px] sm:w-[620px] lg:h-[620px] lg:w-[820px]"
              />
              <div
                aria-hidden="true"
                className="pointer-events-none absolute left-[51%] top-[53%] h-[180px] w-[380px] -translate-x-1/2 -translate-y-1/2 rotate-[7deg] rounded-[50%] border border-[#7E52FF]/10 sm:h-[250px] sm:w-[560px] lg:h-[330px] lg:w-[740px]"
              />
              <img
                src="/images/support_brand.png"
                alt="DirectSwapX support center"
                className="absolute left-1/2 top-1/2 z-10 w-[360px] max-w-none -translate-x-1/2 -translate-y-1/2 object-contain opacity-95 mix-blend-screen [mask-image:radial-gradient(ellipse_at_center,black_48%,black_62%,transparent_84%)] sm:w-[560px] lg:w-[700px] xl:w-[780px]"
              />
            </div>
          </div>

          <div className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {supportOptions.map((option) => (
              <SupportCard
                key={option.title}
                icon={option.icon}
                title={option.title}
                text={option.text}
                action={option.action}
                href={option.href}
              />
            ))}
          </div>

          <div className="mt-6 border-y border-white/[0.07] py-5">
            <div className="grid gap-5 lg:grid-cols-[280px_1fr] lg:items-start">
              <div>
                <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-[#7FA2E8]">
                  Before contacting support
                </p>
                <h2 className="mt-2 max-w-[260px] text-[22px] font-black leading-tight text-white">
                  A few details help us move faster.
                </h2>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                {supportChecklist.map((item) => (
                  <ChecklistItem
                    key={item.title}
                    icon={item.icon}
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

function ChecklistItem({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="flex gap-3">
      <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-[9px] border border-[#7E52FF]/30 bg-[#7E52FF]/[0.08] text-[#A47CFF]">
        {icon}
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

function SupportCard({
  icon,
  title,
  text,
  action,
  href,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
  action: string;
  href: string;
}) {
  const content = (
    <>
      <div className="flex h-[68px] w-[68px] shrink-0 items-center justify-center rounded-full border border-[#7E52FF]/35 bg-[#7E52FF]/[0.12] text-[#A47CFF] transition group-hover:border-[#7E52FF]/55 group-hover:bg-[#7E52FF]/[0.16]">
        {icon}
      </div>
      <div className="min-w-0">
        <h2 className="text-[20px] font-black leading-tight text-white">
          {title}
        </h2>
        <p className="mt-3 max-w-[230px] text-[14px] font-medium leading-6 text-[#A9B2C9]">
          {text}
        </p>
        <p className="mt-5 inline-flex items-center gap-2 text-[15px] font-bold text-[#A47CFF] transition group-hover:text-white">
          {action}
          <ArrowRight size={17} />
        </p>
      </div>
    </>
  );

  const className =
    "group flex min-h-[166px] items-start gap-5 rounded-[8px] border border-white/[0.07] bg-white/[0.035] p-6 shadow-[0_18px_60px_rgba(0,0,0,0.18)] transition hover:border-[#7E52FF]/25 hover:bg-white/[0.05]";

  if (href.startsWith("/")) {
    return (
      <Link to={href} className={className}>
        {content}
      </Link>
    );
  }

  return (
    <a href={href} className={className} target="_blank" rel="noreferrer">
      {content}
    </a>
  );
}
