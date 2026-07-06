import { useEffect, useState } from "react";
import { getPairs, type SwapMode } from "../api/client";

export type PairMap = Record<string, string[]>; // "fromKey" -> ["toKey1", "toKey2", ...]

export function usePairs(fixed: boolean, mode: SwapMode = "cex") {
  const [pairMap, setPairMap] = useState<PairMap>({});
  const [loadingPairs, setLoadingPairs] = useState(false);
  const [pairsError, setPairsError] = useState("");

  useEffect(() => {
    let alive = true;

    async function loadPairs() {
      try {
        setLoadingPairs(true);
        setPairsError("");

        const data: Record<string, string[]> = await getPairs(fixed, mode); // type it explicitly
        if (!alive) return;

        if (data && typeof data === "object" && !Array.isArray(data)) {
          const cleanedMap: PairMap = {};

          Object.entries(data).forEach(([fromKey, toList]) => {
            // Make sure toList is actually an array
            if (Array.isArray(toList)) {
              const cleanFrom = fromKey.toLowerCase();
              cleanedMap[cleanFrom] = toList.map((t: string) => t.toLowerCase());
            }
          });

          setPairMap(cleanedMap);
        } else {
          setPairMap({});
        }
      } catch (error) {
        if (!alive) return;

        setPairMap({});
        setPairsError(
          error instanceof Error ? error.message : "Could not load compatible pairs."
        );
      } finally {
        if (alive) {
          setLoadingPairs(false);
        }
      }
    }

    loadPairs();

    return () => {
      alive = false;
    };
  }, [fixed, mode]);

  return {
    pairMap,
    loadingPairs,
    pairsError,
  };
}
