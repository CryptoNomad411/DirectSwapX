import {
  AlertTriangle,
  CheckCircle2,
  FileText,
  Globe,
  Lock,
  ShieldCheck,
} from "lucide-react";

import LegalPageLayout from "../components/LegalPageLayout";

export default function TermsOfServicePage() {
  return (
    <LegalPageLayout
      eyebrow="Legal information"
      title="Terms of"
      accent="Service"
      intro="Please read these terms before using DirectSwapX. By accessing the platform, creating a swap, or using related tools, you agree to the responsibilities and limitations described here."
      updated="January 2026"
      heroIcon={<FileText size={22} />}
      heroTitle="Clear rules for wallet-first swaps"
      heroText="These terms are designed around non-custodial transactions, third-party routes, and user-controlled wallets."
      summaryTitle="Quick summary"
      highlights={[
        {
          icon: <CheckCircle2 size={20} />,
          text: "Use the platform lawfully and review each route before confirming.",
        },
        {
          icon: <Lock size={20} />,
          text: "You are responsible for wallet addresses, networks, and private-key security.",
        },
        {
          icon: <Globe size={20} />,
          text: "Blockchain transactions may be delayed, irreversible, or affected by network conditions.",
        },
        {
          icon: <AlertTriangle size={20} />,
          text: "Access may be limited for prohibited activity, risk controls, or compliance reasons.",
        },
      ]}
      sections={[
        {
          title: "1. Acceptance of Terms",
          body: (
            <>
              By accessing or using our website, swap interface, exchange tools,
              or related features, you agree to these Terms of Service. If you
              do not agree, you should not use the platform.
            </>
          ),
        },
        {
          title: "2. Our Services",
          body: (
            <>
              DirectSwapX provides a non-custodial crypto swap interface for
              supported digital assets. Coin availability, rates, limits,
              networks, and routing options may change based on liquidity,
              provider availability, network conditions, or security
              requirements.
            </>
          ),
        },
        {
          title: "3. Eligibility",
          body: (
            <>
              You must be legally permitted to use cryptocurrency services in
              your jurisdiction. By using the platform, you confirm that you are
              not located in a restricted region and are not prohibited from
              using digital asset services under applicable law.
            </>
          ),
        },
        {
          title: "4. No Financial Advice",
          body: (
            <>
              Information shown on the platform is provided for general
              informational purposes only. DirectSwapX does not provide
              investment, financial, legal, tax, or trading advice. You are
              responsible for evaluating the risks of every crypto transaction.
            </>
          ),
        },
        {
          title: "5. User Responsibilities",
          body: (
            <>
              You are responsible for providing accurate wallet addresses,
              selecting the correct networks, reviewing transaction details, and
              ensuring your use complies with applicable laws. Incorrect
              addresses, unsupported networks, or blockchain errors may result
              in permanent loss of funds.
            </>
          ),
        },
        {
          title: "6. Transaction Risks",
          body: (
            <>
              Cryptocurrency transactions are generally irreversible. Network
              congestion, confirmation delays, liquidity changes, rate movement,
              provider issues, or technical failures may affect swap timing,
              pricing, or completion.
            </>
          ),
        },
        {
          title: "7. Fees and Rates",
          body: (
            <>
              We aim to show clear route and rate information. Final received
              amounts may vary due to network fees, exchange-rate movement,
              liquidity conditions, blockchain confirmation times, or provider
              routing behavior.
            </>
          ),
        },
        {
          title: "8. Prohibited Use",
          body: (
            <>
              You agree not to use the platform for illegal activity, fraud,
              money laundering, sanctions evasion, terrorist financing, market
              abuse, or activity that violates applicable laws or third-party
              rights. We may refuse, suspend, or restrict access where required
              for security, compliance, or risk management.
            </>
          ),
        },
        {
          title: "9. Privacy and Security",
          body: (
            <>
              We apply security measures intended to protect platform
              operations. No online or blockchain-based service can be
              guaranteed fully secure. You are responsible for safeguarding your
              wallets, private keys, devices, and credentials.
            </>
          ),
        },
        {
          title: "10. Third-Party Services",
          body: (
            <>
              The platform may rely on third-party liquidity providers,
              blockchain networks, wallet providers, analytics tools, or other
              services. We are not responsible for third-party errors, downtime,
              fees, security incidents, or policy changes.
            </>
          ),
        },
        {
          title: "11. Limitation of Liability",
          body: (
            <>
              To the maximum extent permitted by law, DirectSwapX is not liable
              for indirect, incidental, special, consequential, or punitive
              damages, including loss of profits, loss of funds, loss of data,
              or losses resulting from blockchain activity, user error, or
              third-party services.
            </>
          ),
        },
        {
          title: "12. Changes to These Terms",
          body: (
            <>
              We may update these Terms of Service from time to time. Updated
              terms will be posted on this page with a revised last-updated
              date. Continued use of the platform after changes means you
              accept the updated terms.
            </>
          ),
        },
        {
          title: "13. Contact Us",
          body: (
            <>
              If you have questions about these Terms of Service, contact our
              support team through the available support channels on the
              website.
            </>
          ),
        },
      ]}
      features={[
        {
          icon: <ShieldCheck size={20} />,
          title: "Wallet-first",
          text: "You keep control of your wallet and authorize transactions yourself.",
        },
        {
          icon: <Lock size={20} />,
          title: "Security responsibilities",
          text: "Addresses, networks, private keys, and signatures must be reviewed before use.",
        },
        {
          icon: <FileText size={20} />,
          title: "Transparent terms",
          text: "Rules are written around real swap risks and non-custodial routing.",
        },
      ]}
    />
  );
}
