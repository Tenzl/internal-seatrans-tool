'use client'

import { useCallback, useState } from 'react'
import {
  portService,
  type Port,
} from '@/modules/logistics/services/portService'
import { toast } from '@/shared/utils/toast'

/** Owns mutations initiated directly from a table row. */
export function usePortRowActions(onChanged: () => void) {
  const [isBusy, setIsBusy] = useState(false)

  const deletePort = useCallback(
    async (portId: number, portName: string) => {
      if (
        !window.confirm(`Are you sure you want to delete port "${portName}"?`)
      )
        return

      try {
        setIsBusy(true)
        await portService.deletePort(portId)
        onChanged()
        toast.success('Port deleted successfully')
      } catch {
        toast.error('Failed to delete port')
      } finally {
        setIsBusy(false)
      }
    },
    [onChanged]
  )

  const toggleHasInfo = useCallback(
    async (port: Port) => {
      const nextHasInfo: 0 | 1 = port.hasInfo === 1 ? 0 : 1

      try {
        setIsBusy(true)
        await portService.setPortHasInfo(port.id, nextHasInfo)
        onChanged()
        toast.success(
          `Has info set to ${nextHasInfo === 1 ? 'Active' : 'Inactive'}`
        )
      } catch {
        toast.error('Failed to update has info')
      } finally {
        setIsBusy(false)
      }
    },
    [onChanged]
  )

  return { deletePort, isBusy, toggleHasInfo }
}
