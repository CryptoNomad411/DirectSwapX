import { AlertCircle, FileText, RefreshCcw, ShieldCheck } from "lucide-react";

import LegalPageLayout from "../components/LegalPageLayout";

export default function RefundPolicyPage() {
  return (
    <LegalPageLayout
      eyebrow="Legal information"
      title="Refund"
      accent="Policy"
      intro="This Refund Policy explains when a swap may be eligible for review, when refunds are not available, and what information support needs to investigate an issue."
      updated="January 2026"
      heroIcon={<RefreshCcw size={22} />}
      heroTitle="Refund rules for irreversible networks"
      heroText="Crypto transactions are usually final. Refund review focuses on failed, duplicate, or platform-related issues."
      summaryTitle="Quick overview"
      highlights={[
        {
          icon: <ShieldCheck size={20} />,
          text: "Eligible cases are reviewed based on transaction data and provider status.",
        },
        {
          icon: <AlertCircle size={20} />,
          text: "Confirmed blockchain transactions are generally irreversible.",
        },
        {
          icon: <RefreshCcw size={20} />,
          text: "Refund requests should include transaction hashes and issue details.",
        },
      ]}
      sections={[
        {
          title: "1. General Policy",
          body: (
            <>
              Due to the nature of cryptocurrency transactions, most swaps
              processed through the platform are irreversible. Refunds are only
              considered in specific circumstances described in this policy.
            </>
          ),
        },
        {
          title: "2. Eligible Refunds",
          body: (
            <>
              Refunds may be considered when there is a verified platform or
              provider issue, such as duplicate processing, a failed transaction
              caused by internal systems, or another technical error directly
              attributable to the swap flow.
            </>
          ),
        },
        {
          title: "3. Ineligible Transactions",
          body: (
            <>
              Refunds cannot be issued for user mistakes such as sending funds
              to the wrong wallet, choosing the wrong network, entering an
              unsupported address, confirming a valid transaction, market price
              fluctuations, or delays caused by third-party networks, wallets,
              or liquidity providers.
            </>
          ),
        },
        {
          title: "4. Requesting a Refund Review",
          body: (
            <>
              Contact support as soon as possible and include the transaction
              hash, order ID if available, date and time, source and destination
              assets, wallet addresses involved, and a concise description of
              the issue. Missing information may delay review.
            </>
          ),
        },
        {
          title: "5. Review and Processing Time",
          body: (
            <>
              Refund reviews typically require checking blockchain status,
              provider records, and route data. Review time may vary depending
              on network congestion and third-party response times. Approved
              refunds are generally returned to the appropriate wallet address.
            </>
          ),
        },
        {
          title: "6. Network and Provider Limits",
          body: (
            <>
              Some cases depend on blockchain network rules or third-party
              provider policies. DirectSwapX cannot reverse confirmed
              blockchain transactions or override external network and provider
              limitations.
            </>
          ),
        },
        {
          title: "7. Limitation of Liability",
          body: (
            <>
              DirectSwapX is not responsible for losses caused by network
              congestion, blockchain errors, incorrect wallet addresses, wrong
              network selection, wallet compromise, user error, or third-party
              provider failures unless required by applicable law.
            </>
          ),
        },
        {
          title: "8. Changes to This Policy",
          body: (
            <>
              We may update this Refund Policy periodically. Updated policies
              will be posted on this page with a revised last-updated date.
              Continued use of the platform indicates acceptance of the updated
              policy.
            </>
          ),
        },
        {
          title: "9. Contact Us",
          body: (
            <>
              For refund questions or transaction issues, contact our support
              team through the available support channels on the platform.
            </>
          ),
        },
      ]}
      features={[
        {
          icon: <ShieldCheck size={20} />,
          title: "Case review",
          text: "Support checks blockchain and provider status before making a decision.",
        },
        {
          icon: <RefreshCcw size={20} />,
          title: "Clear process",
          text: "Transaction hash, order ID, and wallet details help accelerate review.",
        },
        {
          icon: <FileText size={20} />,
          title: "Defined limits",
          text: "The policy separates eligible platform issues from irreversible user actions.",
        },
      ]}
    />
  );
}
