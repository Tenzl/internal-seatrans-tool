import { describe, expect, it } from 'vitest'
import { createInitialEpdaState, epdaFormReducer } from './epdaFormReducer'
import { buildCreateEpdaPayload, buildPatchEpdaPayload } from './epdaPayload'

describe('EPDA API payload contract', () => {
  it('uses numeric portId and keeps create/patch field parity', () => {
    let state = createInitialEpdaState()
    state = epdaFormReducer(state, {
      type: 'select-port',
      areaCode: '1',
      portId: 21,
      portOfCall: 'HAI PHONG',
    })

    const values = {
      toShipowner: 'Owner',
      mv: 'MV Test',
      cargoQty: '1250',
      boatHireAmount: '100',
      tallyFeeAmount: '200',
      tugAssistanceAmount: '300',
      transportLs: '40',
      boatHireQuarantineAmount: '50',
    } as const
    for (const [field, value] of Object.entries(values)) {
      state = epdaFormReducer(state, {
        type: 'change-field',
        field: field as keyof typeof state.fields,
        value,
      })
    }

    const create = buildCreateEpdaPayload(10, state)
    const patch = buildPatchEpdaPayload(state)

    expect(create).toMatchObject({
      portId: 21,
      portOfCall: 'HAI PHONG',
      quoteForm: 'HN',
      quantityTons: 1250,
      boatHireAmount: 100,
      tallyFeeAmount: 200,
      tugAssistanceAmount: 300,
      transportLs: '40',
      transportQuarantine: '50',
    })
    expect(patch).toMatchObject({
      portId: 21,
      portOfCall: 'HAI PHONG',
      quoteForm: 'HN',
      quantityTons: 1250,
      boatHireAmount: 100,
      tallyFeeAmount: 200,
      tugAssistanceAmount: 300,
      transportLs: '40',
      transportQuarantine: '50',
    })
  })

  it('serializes cleared optional draft fields as null', () => {
    let state = createInitialEpdaState()
    state = epdaFormReducer(state, {
      type: 'change-field',
      field: 'transportLs',
      value: '',
    })
    state = epdaFormReducer(state, {
      type: 'change-field',
      field: 'boatHireAmount',
      value: '',
    })

    expect(buildPatchEpdaPayload(state)).toMatchObject({
      transportLs: null,
      boatHireAmount: null,
    })
  })
})
