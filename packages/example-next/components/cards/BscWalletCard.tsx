import { useWeb3React } from '@web3-react/core'
import { useEffect, useState } from 'react'
import { Card } from '../Card'
import { hooks, bscWallet } from '../../config/connectors/bscWallet'
import Button from '../Button'

const {
  useChainId,
  useAccounts,
  useAccountIndex,
  useIsActivating,
  useIsActive,
  useProvider,
  useBalances,
  useBlockNumber,
  useAddingChain,
  useSwitchingChain,
  useWatchingAsset,
} = hooks

export default function BscWalletCard() {
  const {
    connector: selectedConnector,
    hooks: { usePriorityConnector },
  } = useWeb3React()

  const priorityConnector = usePriorityConnector()
  const isPriority = priorityConnector === bscWallet
  const isSelected = selectedConnector === bscWallet

  const provider = useProvider()
  const chainId = useChainId()
  const accounts = useAccounts()
  const accountIndex = useAccountIndex()
  const isActivating = useIsActivating()
  const isActive = useIsActive()
  const addingChain = useAddingChain()
  const switchingChain = useSwitchingChain()
  const watchingAsset = useWatchingAsset()

  const { blockNumber, fetch: fetchBlockNumber } = useBlockNumber(false)
  const { balances, fetch: fetchBalances } = useBalances(false)

  const [error, setError] = useState(undefined)

  // attempt to connect eagerly on mount
  useEffect(() => {
    void bscWallet.connectEagerly().catch(() => {
      console.debug('Failed to connect eagerly to bsc wallet')
    })
  }, [])

  return (
    <Card
      walletLogoUrl="https://assets-cdn.trustwallet.com/blockchains/smartchain/info/logo.png"
      connector={bscWallet}
      chainId={chainId}
      accountIndex={accountIndex}
      isActivating={isActivating}
      isActive={isActive}
      provider={provider}
      accounts={accounts}
      blockNumber={blockNumber}
      balances={balances}
      addingChain={addingChain}
      switchingChain={switchingChain}
      watchingAsset={watchingAsset}
      error={error}
      setError={setError}
      isPriority={isPriority}
      isSelected={isSelected}
    >
      <Button
        onClick={() => {
          void fetchBlockNumber()
          void fetchBalances()
        }}
      >
        Refresh
      </Button>
    </Card>
  )
}
