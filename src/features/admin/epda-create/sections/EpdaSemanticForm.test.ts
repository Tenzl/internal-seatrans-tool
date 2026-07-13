import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { defaultParameterValues } from '@/modules/inquiries/components/common/quoteParameters'
import { createInitialEpdaState } from '../model/epdaFormReducer'
import { EpdaSemanticForm, type EpdaSemanticFormProps } from './EpdaSemanticForm'

function renderForm(overrides: Partial<EpdaSemanticFormProps> = {}) {
  const props: EpdaSemanticFormProps = {
    state: createInitialEpdaState(),
    ports: [{ id: 38, name: 'Chan May', portOfCall: 'CHAN MAY', provinceId: 1 }],
    commodities: [],
    customerUserId: null,
    validationErrors: {},
    onAreaChange: vi.fn(),
    onCustomerChange: vi.fn(),
    onPortChange: vi.fn(),
    onFieldChange: vi.fn(),
    onRetryTariff: vi.fn(),
    onResetTariff: vi.fn(),
    onReset: vi.fn(),
    onPreview: vi.fn(),
    onIssue: vi.fn(),
    onLock: vi.fn(),
    onSubmit: vi.fn(),
    ...overrides,
  }
  return renderToStaticMarkup(createElement(EpdaSemanticForm, props))
}

describe('EpdaSemanticForm semantic contract', () => {
  it('renders exactly one native form with named, labelled semantic sections', () => {
    const html = renderForm()

    expect(html.match(/<form\b/g)).toHaveLength(1)
    expect(html.match(/<fieldset\b/g)?.length).toBeGreaterThanOrEqual(4)
    expect(html.match(/<legend\b/g)?.length).toBeGreaterThanOrEqual(4)
    expect(html).toContain('<nav aria-label="EPDA form sections"')
    expect(html).toContain('<ol')
    expect(html).toContain('<article')
    expect(html).toContain('<dl')
    expect(html).toContain('<footer')
    expect(html).toContain('name="portId"')
    expect(html).toContain('name="customerUserId"')
    expect(html).toContain('aria-required="true"')
    expect(html).toContain('type="submit"')
    expect(html).not.toContain('onkeydown')
  })

  it('announces tariff failures with retry and disables financial actions', () => {
    const state = createInitialEpdaState()
    state.identity = { areaCode: '2', portId: 38, portOfCall: 'CHAN MAY', quoteForm: 'QN' }
    state.tariff = { status: 'error', requestId: 2, values: null, error: '503' }
    const html = renderForm({ state })

    expect(html).toContain('aria-live="assertive"')
    expect(html).toContain('Retry tariff')
    expect(html).toContain('Preview and issue are disabled')
    expect(html).toMatch(/>Preview<\/button>/)
    expect(html).toMatch(/disabled=""[^>]*>Preview<\/button>/)
  })

  it('keeps preview available while locked and disables mutation actions', () => {
    const state = createInitialEpdaState()
    state.identity = { areaCode: '2', portId: 38, portOfCall: 'CHAN MAY', quoteForm: 'QN' }
    state.tariff = {
      status: 'ready',
      requestId: 2,
      values: defaultParameterValues('QN'),
      error: null,
    }
    const html = renderForm({ state, linkedInquiryId: 7, locked: true })
    const previewButton = html.match(/<button[^>]*>Preview<\/button>/)?.[0]
    const issueButton = html.match(/<button[^>]*>Issue<\/button>/)?.[0]

    expect(previewButton).not.toContain('disabled')
    expect(issueButton).not.toContain('disabled')
  })

  it('locks customer ownership after the draft is linked to an inquiry', () => {
    const html = renderForm({ linkedInquiryId: 7, customerUserId: 22, customerLabel: 'Customer A' })
    const customerControl = html.match(/<button[^>]*id="customerUserId"[^>]*>/)?.[0]

    expect(customerControl).toContain('disabled')
  })
})
