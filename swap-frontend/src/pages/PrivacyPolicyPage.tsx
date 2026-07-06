import { AlertCircle, FileText, Globe, Lock, ShieldCheck } from "lucide-react";

import LegalPageLayout from "../components/LegalPageLayout";

export default function PrivacyPolicyPage() {
  return (
    <LegalPageLayout
      eyebrow="Legal information"
      title="Privacy"
      accent="Policy"
      intro="This Privacy Policy explains how DirectSwapX collects, uses, and protects information when you use the swap interface, support channels, and related platform services."
      updated="January 2026"
      heroIcon={<ShieldCheck size={22} />}
      heroTitle="Privacy for non-custodial swaps"
      heroText="We keep the data model focused on routing, support, security, and operational reliability."
      summaryTitle="Quick overview"
      highlights={[
        {
          icon: <Lock size={20} />,
          text: "We limit collection to information needed for swaps, support, security, and analytics.",
        },
        {
          icon: <Globe size={20} />,
          text: "Some transaction information may be public on blockchain networks.",
        },
        {
          icon: <ShieldCheck size={20} />,
          text: "We do not sell personal information.",
        },
        {
          icon: <AlertCircle size={20} />,
          text: "You remain responsible for protecting your wallet, keys, devices, and signatures.",
        },
      ]}
      sections={[
        {
          title: "1. Information We Collect",
          body: (
            <>
              We may collect information you provide directly, such as wallet
              addresses, support requests, and contact details submitted through
              support channels. We may also collect technical information such
              as browser type, device data, IP address, usage events, and
              transaction-related metadata needed to operate and secure the
              platform.
            </>
          ),
        },
        {
          title: "2. How We Use Information",
          body: (
            <>
              We use information to process swap requests, provide support,
              maintain security, detect misuse, troubleshoot errors, improve
              product performance, analyze platform usage, and comply with
              applicable legal obligations.
            </>
          ),
        },
        {
          title: "3. Blockchain Data",
          body: (
            <>
              Blockchain transactions are generally public and may include
              wallet addresses, transaction hashes, amounts, and network
              details. DirectSwapX cannot control how public blockchain data is
              indexed, copied, or used by third parties.
            </>
          ),
        },
        {
          title: "4. Sharing and Disclosure",
          body: (
            <>
              We do not sell personal information. We may share limited data
              with service providers that support routing, analytics, security,
              customer support, infrastructure, or legal compliance, only as
              needed to operate the platform.
            </>
          ),
        },
        {
          title: "5. Security Measures",
          body: (
            <>
              We use technical and organizational safeguards intended to protect
              platform systems and operational data. No method of transmission,
              storage, or blockchain interaction is fully secure. You remain
              responsible for wallet security, private keys, devices, and
              transaction approvals.
            </>
          ),
        },
        {
          title: "6. Cookies and Analytics",
          body: (
            <>
              We may use cookies and similar technologies to maintain site
              functionality, understand usage patterns, diagnose technical
              issues, and improve the product. Browser settings may allow you to
              manage cookies, although some features may not work as expected.
            </>
          ),
        },
        {
          title: "7. Data Retention",
          body: (
            <>
              We retain information only as long as reasonably necessary for
              operations, support, security, analytics, compliance, and dispute
              resolution. Retention periods may vary based on the type of data
              and applicable requirements.
            </>
          ),
        },
        {
          title: "8. User Rights",
          body: (
            <>
              Depending on your jurisdiction, you may have rights to access,
              correct, delete, restrict, or request a copy of certain personal
              information. Contact support to submit a privacy-related request.
            </>
          ),
        },
        {
          title: "9. Third-Party Links",
          body: (
            <>
              The platform may link to third-party services, wallets,
              explorers, or liquidity providers. We are not responsible for the
              privacy practices, security, or content of external services.
            </>
          ),
        },
        {
          title: "10. Changes to This Policy",
          body: (
            <>
              We may update this Privacy Policy periodically. Updated policies
              will be posted on this page with a revised last-updated date.
              Continued use of the platform indicates acceptance of the updated
              policy.
            </>
          ),
        },
        {
          title: "11. Contact Us",
          body: (
            <>
              For privacy-related questions or requests, contact our support
              team through the available support channels on the platform.
            </>
          ),
        },
      ]}
      features={[
        {
          icon: <ShieldCheck size={20} />,
          title: "Data minimization",
          text: "Information collection is scoped to product, security, and support needs.",
        },
        {
          icon: <Lock size={20} />,
          title: "User control",
          text: "You control your wallet and remain responsible for key security.",
        },
        {
          icon: <FileText size={20} />,
          title: "Clear disclosure",
          text: "Policy language explains where blockchain transparency and privacy intersect.",
        },
      ]}
    />
  );
}
