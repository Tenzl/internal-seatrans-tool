import { describe, expect, it } from 'vitest'
import { createInitialEpdaState } from './epdaFormReducer'
import { validateEpdaState } from './epdaFormSchema'

function portSelectedState() {
  const state = createInitialEpdaState()
  state.identity = { areaCode: '2', portId: 38, portOfCall: 'CHAN MAY', quoteForm: 'QN' }
  return state
}

describe('validateEpdaState workflow modes', () => {
  it('allows a partial draft with a selected port but marks it incomplete', () => {
    const state = portSelectedState()

    expect(validateEpdaState(state, { mode: 'draft', cargoNameRequired: false })).toEqual({})
    expect(validateEpdaState(state, { mode: 'complete', cargoNameRequired: false })).not.toEqual({})
  })

  it('does not require cargo name for a normalized type with no catalog names', () => {
    const state = portSelectedState()
    Object.assign(state.fields, {
      toShipowner: 'Owner', mv: 'SEA', dwt: '1', grt: '1', loa: '1', cargoQty: '1',
      cargoType: 'IN_EQUIPMENT', purposeOfCalling: 'MUC_DICH_KHAC',
      dischargeLoadingLocation: 'Berth',
    })

    expect(validateEpdaState(state, { mode: 'complete', cargoNameRequired: false }).cargoName).toBeUndefined()
    expect(validateEpdaState(state, { mode: 'complete', cargoNameRequired: true }).cargoName).toBeDefined()
  })

  it('requires freight-tax mode for import/export and transshipment/export calls', () => {
    const state = portSelectedState()
    Object.assign(state.fields, {
      toShipowner: 'Owner', mv: 'SEA', dwt: '1', grt: '1', loa: '1', cargoQty: '1',
      cargoType: 'IN_BULK', purposeOfCalling: 'NHAP_XUAT',
      dischargeLoadingLocation: 'Berth', frtTaxType: '',
    })

    expect(validateEpdaState(state, { mode: 'complete', cargoNameRequired: false }).frtTaxType)
      .toBe('Select the freight-tax mode for this purpose of call.')
    state.fields.purposeOfCalling = 'MUC_DICH_KHAC'
    expect(validateEpdaState(state, { mode: 'complete', cargoNameRequired: false }).frtTaxType).toBeUndefined()
  })
})
