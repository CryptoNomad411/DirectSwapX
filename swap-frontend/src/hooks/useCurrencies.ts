import { useEffect, useState } from 'react'
import { getCurrencies, type SwapMode } from '../api/client'

export function useCurrencies(mode: SwapMode = "cex") {
  const [currencies, setCurrencies] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true

    const load = async () => {
      try {
        setLoading(true)
        setCurrencies([])
        const data = await getCurrencies(mode)
        if (alive) setCurrencies(data || [])
      } catch {
        if (alive) setCurrencies([])
      } finally {
        if (alive) setLoading(false)
      }
    }

    load()

    return () => {
      alive = false
    }
  }, [mode])

  return { currencies, loading }
}
