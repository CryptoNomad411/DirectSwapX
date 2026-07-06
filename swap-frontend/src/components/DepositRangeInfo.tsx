import { AlertCircle } from "lucide-react";

type DepositRange = {
  min?: string | number;
  max?: string | number;
  unlimitedMax?: boolean;
};

export default function DepositRangeInfo({
  ranges,
  ticker,
  className = "",
}: {
  ranges?: DepositRange | null;
  ticker?: string;
  className?: string;
}) {
  const min = formatRangeAmount(ranges?.min);
  const max = formatRangeAmount(ranges?.max);
  const hasUnlimitedMax = Boolean(ranges?.unlimitedMax);

  if (!min && !max && !hasUnlimitedMax) return null;

  const symbol = ticker?.toUpperCase() || "";

  return (
    <div
      className={`flex items-start gap-2 rounded-[8px] border border-blue-400/25 bg-blue-500/10 px-4 py-3 text-sm font-semibold text-blue-200 ${className}`}
    >
      <AlertCircle size={16} className="mt-[2px] shrink-0" />
      <span className="flex flex-wrap gap-x-5 gap-y-1">
        {min && (
          <span>
            Min deposit: {min} {symbol}
          </span>
        )}
        {max && (
          <span>
            Max deposit: {max} {symbol}
          </span>
        )}
        {!max && hasUnlimitedMax && (
          <span>
            Max deposit: No limit
          </span>
        )}
      </span>
    </div>
  );
}

function formatRangeAmount(value: unknown) {
  const rawValue = String(value ?? "").trim();
  const numericValue = Number(rawValue);

  if (!rawValue || !Number.isFinite(numericValue) || numericValue <= 0) {
    return "";
  }

  if (numericValue >= 1) {
    return new Intl.NumberFormat("en-US", {
      maximumFractionDigits: 8,
    }).format(numericValue);
  }

  return rawValue
    .replace(/(\.\d*?[1-9])0+$/, "$1")
    .replace(/\.0+$/, "");
}
