export interface Currency {
  ticker: string
  network: string
  name: string
  image: string
  enabled: boolean
  isFiat: boolean
  isAvailableFixed: boolean
  isAvailableFloat: boolean
  provider?: string
  rubic?: {
    address: string
    blockchain: string
    blockchainId?: number
    decimals?: number
    symbol?: string
    name?: string
    usdPrice?: number
    type?: string
    native?: boolean
  }
  baltex?: {
    id?: number
    ticker?: string
    network?: string
    symbol?: string
    hasMemo?: boolean
    requireMemo?: boolean
    supportsFixedRate?: boolean
    regexAddress?: string
    regexMemo?: string
    addressExplorer?: string
    txExplorer?: string
  }
  baltexDefi?: {
    address?: string
    decimals?: number
    symbol?: string
    network?: string
    name?: string
    image?: string
  }
  changehero?: {
    id?: string
    ticker?: string
    network?: string
    code?: string
    extraIdName?: string | null
  }
}

export interface Exchange {
  id: string
  status: string
  amount: number
  expectedAmount: number
  addressFrom: string
  addressTo: string
}
