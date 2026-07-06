import { useEffect } from "react";
import { Routes, Route } from "react-router-dom";
import HomePage from "./pages/HomePage";
import SwapPage from "./pages/SwapPage";
import ExchangePage from "./pages/ExchangePage";
import HowItWorksPage from "./pages/HowItWorksPage";
import AboutPage from "./pages/AboutPage";
import FAQPage from "./pages/FAQPage";
import SupportPage from "./pages/SupportPage";
import TermsOfServicePage from "./pages/TermsOfServicePage";
import RefundPolicyPage from "./pages/RefundPolicyPage";
import PrivacyPolicyPage from "./pages/PrivacyPolicyPage";
import { logUserAgent } from "./api/client";

type NavigatorWithSystemHints = Navigator & {
  deviceMemory?: number;
  userAgentData?: {
    brands?: Array<{ brand: string; version: string }>;
    mobile?: boolean;
    platform?: string;
    getHighEntropyValues?: (
      hints: string[]
    ) => Promise<Record<string, string | boolean | string[]>>;
  };
};

let hasLoggedVisit = false;

function App() {
  useEffect(() => {
    if (hasLoggedVisit) return;
    hasLoggedVisit = true;

    const sendVisitLog = async () => {
      try {
        await logUserAgent(await buildVisitPayload());
      } catch {
        // Visit logging should never block or degrade the app.
      }
    };

    sendVisitLog();
  }, []);

  return (
    <Routes>

      {/* Homepage */}
      <Route path="/" element={<HomePage />} />

      <Route path="/swap/:fromTicker/:fromNetwork/:toTicker/:toNetwork/:amountIn/:fixedRate" element={<SwapPage />} />
      <Route path="/exchange/:id" element={<ExchangePage />} />

      {/* How It Works */}
      <Route
        path="/how-it-works"
        element={<HowItWorksPage />}
      />

      {/* About */}
      <Route path="/about" element={<AboutPage />} />

      {/* FAQ */}
      <Route path="/faq" element={<FAQPage />} />

      {/* Support */}
      <Route path="/support" element={<SupportPage />} />

      {/* TermsOfService */}
      <Route path="/terms" element={<TermsOfServicePage />} />

      {/* Refund Policy */}
      <Route path="/refund-policy" element={<RefundPolicyPage />} />

      {/* Privacy Policy */}
      <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
    </Routes>
  );
}

async function buildVisitPayload() {
  const nav = navigator as NavigatorWithSystemHints;
  const userAgentData = nav.userAgentData;
  const highEntropyValues = userAgentData?.getHighEntropyValues
    ? await userAgentData
        .getHighEntropyValues([
          "architecture",
          "bitness",
          "model",
          "platformVersion",
          "uaFullVersion",
          "fullVersionList",
        ])
        .catch(() => ({}))
    : {};

  return {
    userAgent: nav.userAgent,
    referrer: document.referrer,
    page: {
      url: window.location.href,
      path: window.location.pathname,
      search: window.location.search,
      title: document.title,
    },
    system: {
      language: nav.language,
      languages: nav.languages,
      platform: nav.platform,
      cookieEnabled: nav.cookieEnabled,
      hardwareConcurrency: nav.hardwareConcurrency,
      deviceMemory: nav.deviceMemory,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
        devicePixelRatio: window.devicePixelRatio,
      },
      screen: {
        width: window.screen.width,
        height: window.screen.height,
        colorDepth: window.screen.colorDepth,
      },
      userAgentData: userAgentData
        ? {
            brands: userAgentData.brands,
            mobile: userAgentData.mobile,
            platform: userAgentData.platform,
            highEntropyValues,
          }
        : null,
    },
  };
}

export default App;
