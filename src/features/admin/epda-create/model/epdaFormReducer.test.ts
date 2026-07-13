import { describe, expect, it } from 'vitest'
import { defaultParameterValues } from '@/modules/inquiries/components/common/quoteParameters'
import {
  createInitialEpdaState,
  epdaFormReducer,
} from './epdaFormReducer'

describe('epdaFormReducer tariff ownership', () => {
  const chanMayParams = () => {
    const values = defaultParameterValues('QN')
    values.hours.berthHours = 137
    values.hours.anchorageHours = 31
    values.garbage.atBerthUsd = 88
    return values
  }

  it('ignores a stale A response after the user has selected port B', () => {
    let state = createInitialEpdaState()
    state = epdaFormReducer(state, {
      type: 'select-port',
      areaCode: '2',
      portId: 38,
      portOfCall: 'CHAN MAY',
    })
    state = epdaFormReducer(state, { type: 'tariff-requested', requestId: 1 })
    state = epdaFormReducer(state, {
      type: 'select-port',
      areaCode: '2',
      portId: 39,
      portOfCall: 'DA NANG',
    })
    state = epdaFormReducer(state, { type: 'tariff-requested', requestId: 2 })
    state = epdaFormReducer(state, {
      type: 'tariff-loaded',
      requestId: 1,
      values: chanMayParams(),
    })

    expect(state.identity.portId).toBe(39)
    expect(state.tariff.status).toBe('loading')
    expect(state.fields.berthHours).not.toBe('137')
  })

  it('seeds only pristine fields when the selected port tariff arrives', () => {
    let state = createInitialEpdaState()
    state = epdaFormReducer(state, {
      type: 'change-field',
      field: 'berthHours',
      value: '222',
    })
    state = epdaFormReducer(state, {
      type: 'select-port',
      areaCode: '2',
      portId: 38,
      portOfCall: 'CHAN MAY',
    })
    state = epdaFormReducer(state, { type: 'tariff-requested', requestId: 3 })
    state = epdaFormReducer(state, {
      type: 'tariff-loaded',
      requestId: 3,
      values: chanMayParams(),
    })

    expect(state.fields.berthHours).toBe('222')
    expect(state.fields.anchorageHours).toBe('31')
    expect(state.tariff.status).toBe('ready')
  })

  it('explicitly resets dirty tariff fields to the Chân Mây override', () => {
    let state = createInitialEpdaState()
    state = epdaFormReducer(state, {
      type: 'change-field',
      field: 'berthHours',
      value: '222',
    })
    state = epdaFormReducer(state, {
      type: 'select-port',
      areaCode: '2',
      portId: 38,
      portOfCall: 'CHAN MAY',
    })
    state = epdaFormReducer(state, { type: 'tariff-requested', requestId: 4 })
    state = epdaFormReducer(state, {
      type: 'tariff-loaded',
      requestId: 4,
      values: chanMayParams(),
    })
    state = epdaFormReducer(state, { type: 'reset-tariff-fields' })

    expect(state.fields.berthHours).toBe('137')
    expect(state.dirtyFields.berthHours).toBeUndefined()
  })

  it('discards confirmed old-port edits before seeding the new port override', () => {
    let state = createInitialEpdaState()
    state = epdaFormReducer(state, { type: 'change-field', field: 'berthHours', value: '222' })
    state = epdaFormReducer(state, {
      type: 'select-port',
      areaCode: '2',
      portId: 38,
      portOfCall: 'CHAN MAY',
      discardTariffEdits: true,
    })
    state = epdaFormReducer(state, { type: 'tariff-requested', requestId: 5 })
    state = epdaFormReducer(state, {
      type: 'tariff-loaded',
      requestId: 5,
      values: chanMayParams(),
    })

    expect(state.fields.berthHours).toBe('137')
    expect(state.dirtyFields.berthHours).toBeUndefined()
  })
})
