'use client'

import { useCallback, useEffect, useRef, useState, type Dispatch } from 'react'
import { epdaParametersService } from '@/features/admin/services/epdaParametersService'
import type { EpdaFormAction } from '../model/epdaFormReducer'
import type { EpdaPortIdentity } from '../model/epdaForm.types'

export function useEpdaTariff(
  identity: EpdaPortIdentity,
  dispatch: Dispatch<EpdaFormAction>,
) {
  const requestSequence = useRef(0)
  const [retryKey, setRetryKey] = useState(0)

  useEffect(() => {
    if (!identity.areaCode || !identity.portId) return

    const controller = new AbortController()
    const requestId = ++requestSequence.current
    dispatch({ type: 'tariff-requested', requestId })

    void epdaParametersService
      .getEffective(identity.areaCode, identity.portId, controller.signal)
      .then((values) => {
        dispatch({ type: 'tariff-loaded', requestId, values })
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return
        dispatch({
          type: 'tariff-failed',
          requestId,
          error:
            error instanceof Error
              ? error.message
              : 'Unable to load the effective port tariff.',
        })
      })

    return () => controller.abort()
  }, [dispatch, identity.areaCode, identity.portId, retryKey])

  return useCallback(() => setRetryKey((value) => value + 1), [])
}
