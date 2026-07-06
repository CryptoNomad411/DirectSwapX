import { useEffect, useState } from 'react'
import { getEstimate, type SwapMode } from '../api/client'

export function useEstimate({ from, to, amount, fixed, reverse, mode = "cex" }: any) {
  const [estimate, setEstimate] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const swapMode = mode as SwapMode

  useEffect(() => {
    if (!from || !to || !amount) {
      setEstimate(null)
      return
    }

    let cancelled = false
    const requestMeta = {
      requestAmount: amount,
      requestFixed: fixed,
      requestReverse: reverse,
      requestMode: swapMode,
    }

    const timeout = setTimeout(async () => {
      try {
        setLoading(true)

        const data = await getEstimate({
          from,
          to,
          amount,
          fixed: fixed,
          reverse: reverse,
          provider: swapMode,
        })

        if (data?.unavailable) {
          if (!cancelled) setEstimate({ ...data, ...requestMeta })
          return
        }

        const immediateFromUsd = getDirectUsdValue(data, 'from')
        const immediateToUsd = getDirectUsdValue(data, 'to')

        if (!cancelled) {
          setEstimate({
            ...data,
            ...requestMeta,
            fromUsd: immediateFromUsd,
            toUsd: immediateToUsd,
          })
        }
      } catch {
        if (!cancelled) setEstimate(null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }, 600)

    return () => {
      cancelled = true
      clearTimeout(timeout)
    }
  }, [from, to, amount, fixed, reverse, swapMode])

  return { estimate, loading }
}

function toFiniteNumber(value: any) {
  const numberValue = Number(value)
  return Number.isFinite(numberValue) ? numberValue : 0
}

function getDirectUsdValue(data: any, side: 'from' | 'to') {
  const keys =
    side === 'from'
      ? ['fromUsd', 'amountFromUsd', 'amountFromInUsd', 'usdFrom']
      : ['toUsd', 'amountToUsd', 'amountToInUsd', 'usdTo', 'receiveUsd']

  for (const key of keys) {
    const value = toFiniteNumber(data?.[key])
    if (value > 0) return value
  }

  return 0
}
