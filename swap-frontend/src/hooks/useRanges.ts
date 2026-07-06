import { useEffect, useState } from "react";
import { getRanges, type SwapMode } from "../api/client";

export function useRanges({
  from,
  to,
  amount,
  fixed = false,
  reverse = false,
  mode = "cex",
}: any) {
  const [ranges, setRanges] = useState<any>(null);
  const swapMode = mode as SwapMode;

  useEffect(() => {
    if (!from || !to) {
      setRanges(null);
      return;
    }

    let cancelled = false;

    const load = async () => {
      try {
        const data = await getRanges({
          from,
          to,
          amount,
          fixed,
          reverse,
          provider: swapMode,
        });

        if (!cancelled) setRanges(normalizeRanges(data));
      } catch {
        if (!cancelled) setRanges(null);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [from, to, amount, fixed, reverse, swapMode]);

  return { ranges };
}

function normalizeRanges(data: any) {
  const source = data?.ranges || data?.range || data;
  if (!source || typeof source !== "object") return null;

  const min = firstDefined(source.min, source.minAmount, source.min_amount);
  const max = firstDefined(source.max, source.maxAmount, source.max_amount);
  const unlimitedMax =
    Boolean(source.unlimitedMax || source.maxUnlimited) || Number(max) === 0;
  const normalizedMax = unlimitedMax ? null : max;

  if (!min && !normalizedMax && !unlimitedMax) return null;

  return {
    min: min ?? null,
    max: normalizedMax ?? null,
    unlimitedMax,
  };
}

function firstDefined(...values: any[]) {
  return values.find((value) => value !== undefined && value !== null && value !== "");
}
