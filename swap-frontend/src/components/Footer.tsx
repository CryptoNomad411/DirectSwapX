import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="border-t border-white/10 bg-[#030817]">
      <div className="mx-auto grid max-w-[1600px] gap-12 px-[90px] py-[30px] lg:grid-cols-[1.35fr_1fr_1fr_1.15fr_1.25fr]">
        <div>
          <Link to="/" className="flex items-center gap-3">
            <BrandMark />
            <span className="text-[22px] font-bold text-white">DirectSwapX</span>
          </Link>

          <p className="mt-4 max-w-[250px] text-[15px] font-medium leading-7 text-[#8F9AB5]">
            Instant. Secure. Non-custodial. Crypto swaps, made direct.
          </p>

          <div className="mt-5 flex items-center gap-3">
            <SocialIcon
              href="https://x.com/DirectSwapXOfficial"
              icon={<XBrandIcon className="h-4 w-4" />}
              label="X: @DirectSwapXOfficial"
            />
            <SocialIcon
              href="https://t.me/DirectSwapXOfficial"
              icon={<TelegramBrandIcon className="h-4 w-4" />}
              label="Telegram: @DirectSwapXSupport"
            />
            <SocialIcon href="/support" icon={<DiscordIcon className="h-4 w-4" />} label="Support" />
          </div>
        </div>

        <FooterColumn
          title="Company"
          links={[
            { label: "About Us", href: "/about" },
            { label: "Careers", href: "/about" },
            { label: "Press Kit", href: "/about" },
          ]}
        />

        <FooterColumn
          title="Support"
          links={[
            { label: "FAQ", href: "/faq" },
            { label: "How it Works", href: "/how-it-works" },
            { label: "Contact Us", href: "/support" },
          ]}
        />

        <FooterColumn
          title="Legal"
          links={[
            { label: "Terms of Service", href: "/terms" },
            { label: "Privacy Policy", href: "/privacy-policy" },
            { label: "Refund Policy", href: "/refund-policy" },
          ]}
        />
        <div className="min-w-[180px] text-left lg:text-right"> 
        <p className="text-[15px] font-medium text-[#475569]">Copyright 2026 DirectSwapX</p>
        <p className="mt-3 text-[15px] text-[#64748B]">All rights reserved.</p>
        <a href="https://www.trustpilot.com/evaluate/directswapx.com" target="_blank" rel="noreferrer" 
        className="mt-4 inline-flex items-center gap-2 rounded-full border border-[#64748B] bg-[#64748B] px-3.5 py-2 text-[15px] font-bold text-[#0F172A] shadow-[0_8px_24px_rgba(15,23,42,0.06)] transition hover:-translate-y-0.5 hover:border-[#00B67A] hover:shadow-[0_12px_30px_rgba(15,23,42,0.1)] focus:outline-none focus:ring-2 focus:ring-[#00B67A]/30">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#00B67A] text-white shadow-[inset_0_-2px_4px_rgba(0,0,0,0.12)]">
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="m12 2.6 2.76 5.59 6.17.9-4.47 4.35 1.06 6.14L12 16.68l-5.52 2.9 1.06-6.14-4.47-4.35 6.17-.9L12 2.6Z"></path>
          </svg>
          </span>
          Rate us on Trustpilot
        </a></div>
      </div>
    </footer>
  );
}

type FooterColumnProps = {
  title: string;
  links: {
    label: string;
    href: string;
  }[];
};

function FooterColumn({ title, links }: FooterColumnProps) {
  return (
    <div>
      <h3 className="text-[15px] font-bold text-white">{title}</h3>

      <div className="mt-4 flex flex-col gap-3">
        {links.map((link) => (
          <Link
            key={link.label}
            to={link.href}
            className="text-[15px] font-medium text-[#8F9AB5] transition hover:text-white"
          >
            {link.label}
          </Link>
        ))}
      </div>
    </div>
  );
}

function SocialIcon({
  href,
  icon,
  label,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
}) {
  const external = href.startsWith("http");

  if (!external) {
    return (
      <Link
        to={href}
        aria-label={label}
        title={label}
        className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-[#B8C1D6] transition hover:border-violet-400/50 hover:bg-violet-500/15 hover:text-white"
      >
        {icon}
      </Link>
    );
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label={label}
      title={label}
      className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-[#B8C1D6] transition hover:border-violet-400/50 hover:bg-violet-500/15 hover:text-white"
    >
      {icon}
    </a>
  );
}

function BrandMark() {
  return (
    <img
      src="/logo.png?v=5"
      alt=""
      aria-hidden="true"
      className="h-9 w-9 rounded-[9px] object-cover"
    />
  );
}

function XBrandIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M13.9 10.47 21.35 2h-1.76l-6.47 7.35L7.96 2H2l7.81 11.12L2 22h1.76l6.83-7.76L16.04 22H22l-8.1-11.53Zm-2.42 2.75-.79-1.1L4.39 3.3h2.72l5.08 7.11.79 1.1 6.61 9.25h-2.72l-5.39-7.54Z" />
    </svg>
  );
}

function TelegramBrandIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M20.6 4.2 2.9 11.03c-1.21.49-1.2 1.18-.22 1.48l4.55 1.42 1.75 5.36c.22.61.11.85.75.85.49 0 .71-.23.99-.5l2.38-2.31 4.95 3.66c.91.5 1.57.24 1.8-.84L23.1 5.12c.33-1.32-.51-1.92-2.5-.92Zm-2.85 3.46-8.46 7.63-.32 3.43-1.55-4.8 10.98-6.91c.48-.3.93-.13-.65.65Z" />
    </svg>
  );
}

function DiscordIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M19.54 5.42A17.6 17.6 0 0 0 15.1 4l-.22.44a15.8 15.8 0 0 1 3.94 1.94A13.1 13.1 0 0 0 12 4.75a13.1 13.1 0 0 0-6.82 1.63 15.8 15.8 0 0 1 3.94-1.94L8.9 4c-1.55.27-3.03.75-4.44 1.42C1.66 9.58.9 13.65 1.28 17.67A17.8 17.8 0 0 0 6.72 20.4l.67-.92a11.2 11.2 0 0 1-1.06-.51l.26-.2A12.67 12.67 0 0 0 12 20c1.9 0 3.72-.42 5.41-1.23l.26.2c-.34.19-.69.36-1.06.51l.67.92a17.8 17.8 0 0 0 5.44-2.73c.45-4.66-.77-8.7-3.18-12.25ZM8.42 15.2c-1.03 0-1.87-.94-1.87-2.1 0-1.15.82-2.1 1.87-2.1s1.89.95 1.87 2.1c0 1.16-.83 2.1-1.87 2.1Zm7.16 0c-1.03 0-1.87-.94-1.87-2.1 0-1.15.82-2.1 1.87-2.1s1.89.95 1.87 2.1c0 1.16-.82 2.1-1.87 2.1Z" />
    </svg>
  );
}
