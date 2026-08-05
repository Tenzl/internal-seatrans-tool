import { QueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/shared/config/react-query.config'
import { describe, expect, it } from 'vitest'
import { hardResetPartnerCaches } from './partnerCache'

describe('hardResetPartnerCaches', () => {
  it('drops picker caches, invalidates the table and preserves unrelated data', async () => {
    const client = new QueryClient()
    const listKey = queryKeys.partnersList(0, '', 'ALL', 'ALL', 'ALL')
    const optionsKey = queryKeys.partnerDocumentOptions('SHIPPER', null, '')
    const selectedKey = queryKeys.partnerDocumentSelected(147)

    client.setQueryData(listKey, { content: [{ id: 147 }] })
    client.setQueryData(optionsKey, { pages: [{ content: [{ id: 147 }] }] })
    client.setQueryData(selectedKey, { id: 147, name: 'Old name' })
    client.setQueryData(['unrelated'], 'keep')

    await hardResetPartnerCaches(client)

    expect(client.getQueryData(optionsKey)).toBeUndefined()
    expect(client.getQueryData(selectedKey)).toBeUndefined()
    expect(client.getQueryState(listKey)?.isInvalidated).toBe(true)
    expect(client.getQueryData(['unrelated'])).toBe('keep')
  })
})
