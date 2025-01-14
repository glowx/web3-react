import { getAddress } from '@ethersproject/address'
import type { Actions, Web3ReactState, Web3ReactStateUpdate, Web3ReactStore } from '@web3-react/types'
import { createStore } from 'zustand'

/**
 * MAX_SAFE_CHAIN_ID is the upper bound limit on what will be accepted for `chainId`
 * `MAX_SAFE_CHAIN_ID = floor( ( 2**53 - 39 ) / 2 ) = 4503599627370476`
 *
 * @see {@link https://github.com/MetaMask/metamask-extension/blob/b6673731e2367e119a5fee9a454dd40bd4968948/shared/constants/network.js#L31}
 */
export const MAX_SAFE_CHAIN_ID = 4503599627370476

function validateChainId(chainId: number): void {
  if (!Number.isInteger(chainId) || chainId <= 0 || chainId > MAX_SAFE_CHAIN_ID) {
    throw new Error(`Invalid chainId ${chainId}`)
  }
}

function validateAccount(account: string): string {
  return getAddress(account)
}

const DEFAULT_STATE = {
  chainId: undefined,
  accounts: undefined,
  accountIndex: undefined,
  activating: false,
  addingChain: undefined,
  switchingChain: undefined,
  watchingAsset: undefined,
}

export function createWeb3ReactStoreAndActions(): [Web3ReactStore, Actions] {
  const store = createStore<Web3ReactState>()(() => DEFAULT_STATE)

  // flag for tracking updates so we don't clobber data when cancelling activation
  let nullifier = 0

  /**
   * Sets activating to true, indicating that an update is in progress.
   *
   * @returns cancelActivation - A function that cancels the activation by setting activating to false,
   * as long as there haven't been any intervening updates.
   */
  function startActivation(): () => Web3ReactState {
    const nullifierCached = ++nullifier

    store.setState({ ...DEFAULT_STATE, activating: true })

    // return a function that cancels the activation if nothing else has happened
    return (): Web3ReactState => {
      if (nullifier === nullifierCached) {
        store.setState({ activating: false, addingChain: undefined, switchingChain: undefined })
      }

      return store.getState()
    }
  }

  /**
   * Used to report a `stateUpdate` which is merged with existing state. The first `stateUpdate` that results in chainId
   * and accounts being set will also set activating to false, indicating a successful connection.
   *
   * @param stateUpdate - The state update to report.
   */
  function update(stateUpdate: Web3ReactStateUpdate, skipValidation?: boolean): Web3ReactState {
    // validate chainId statically, independent of existing state
    if (stateUpdate.chainId !== undefined && !skipValidation) {
      validateChainId(stateUpdate.chainId)
    }

    // validate accounts statically, independent of existing state
    if (stateUpdate.accounts !== undefined && !skipValidation) {
      for (let i = 0; i < stateUpdate.accounts.length; i++) {
        stateUpdate.accounts[i] = validateAccount(stateUpdate.accounts[i])
      }
    }

    nullifier++

    store.setState((existingState: Web3ReactState): Web3ReactState => {
      // determine the next chainId and accounts
      const chainId = stateUpdate.chainId ?? existingState.chainId
      const accounts = stateUpdate.accounts ?? existingState.accounts

      // ensure that the activating flag is cleared when appropriate
      let activating = existingState.activating
      if (activating && chainId && accounts) {
        activating = false
      }

      // these properties may be set to undefined
      const stateUpdatePropertyNames = Object.getOwnPropertyNames(stateUpdate)

      const accountIndex = stateUpdatePropertyNames.includes('accountIndex')
        ? stateUpdate.accountIndex
        : existingState.accountIndex
      const addingChain = stateUpdatePropertyNames.includes('addingChain')
        ? stateUpdate.addingChain
        : existingState.addingChain
      const switchingChain = stateUpdatePropertyNames.includes('switchingChain')
        ? stateUpdate.switchingChain
        : existingState.switchingChain
      const watchingAsset = stateUpdatePropertyNames.includes('watchingAsset')
        ? stateUpdate.watchingAsset
        : existingState.watchingAsset

      return {
        chainId,
        accountIndex,
        accounts,
        activating,
        addingChain,
        switchingChain,
        watchingAsset,
      }
    })

    return store.getState()
  }

  /**
   * Resets connector state back to the default state.
   */
  function resetState(): Web3ReactState {
    nullifier++
    store.setState(DEFAULT_STATE)
    return DEFAULT_STATE
  }

  /**
   * Returns the connectors state.
   */
  function getState(): Web3ReactState {
    return store.getState()
  }

  return [store, { startActivation, update, resetState, getState }]
}
