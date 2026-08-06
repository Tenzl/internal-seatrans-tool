/** Party id stored on transport-document forms (positive int or empty). */
export function asPartyId(value: unknown): number | null {
  return typeof value === 'number' && Number.isInteger(value) && value > 0
    ? value
    : null
}

export function asPartyText(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

/** Checkbox is usable once Consignee has a partner id and/or address text. */
export function canEnableNotifySameAsConsignee(values: {
  consignee?: unknown
  consigneePartyId?: unknown
}): boolean {
  return (
    asPartyId(values.consigneePartyId) != null ||
    asPartyText(values.consignee).trim().length > 0
  )
}

/**
 * Apply / clear the AN "Same as Consignee" flag.
 * Checking copies Consignee partner id + address into Notify Party.
 * Unchecking only clears the flag (leaves Notify as last copied values).
 */
export function applyNotifySameAsConsignee(
  values: {
    consignee?: unknown
    consigneePartyId?: unknown
  },
  checked: boolean
): {
  notifyPartySameAsConsignee: boolean
  notifyParty?: string
  notifyPartyId?: number | null
} {
  if (!checked) {
    return { notifyPartySameAsConsignee: false }
  }

  return {
    notifyPartySameAsConsignee: true,
    notifyParty: asPartyText(values.consignee),
    notifyPartyId: asPartyId(values.consigneePartyId),
  }
}

/**
 * While the flag is on, mirror Consignee field edits onto Notify Party.
 * Clearing Consignee's partner id also turns the flag off.
 */
export function syncNotifyFromConsigneeEdit(
  key: string,
  value: unknown
): Record<string, unknown> | null {
  if (key === 'consignee') {
    return { notifyParty: asPartyText(value) }
  }
  if (key === 'consigneePartyId') {
    const nextId = asPartyId(value)
    if (nextId == null) {
      return {
        notifyPartyId: null,
        notifyPartySameAsConsignee: false,
      }
    }
    return { notifyPartyId: nextId }
  }
  return null
}

/**
 * After save/load, restore the checkbox when the flag is missing (legacy) but
 * Notify still mirrors Consignee. Never overrides an explicit `false` so
 * uncheck → Save stays unchecked.
 */
export function deriveNotifySameAsConsignee(values: {
  notifyPartySameAsConsignee?: unknown
  consignee?: unknown
  consigneePartyId?: unknown
  notifyParty?: unknown
  notifyPartyId?: unknown
}): boolean {
  if (values.notifyPartySameAsConsignee === true) return true
  if (values.notifyPartySameAsConsignee === false) return false

  const consigneeId = asPartyId(values.consigneePartyId)
  const notifyId = asPartyId(values.notifyPartyId)
  if (consigneeId != null && notifyId != null && consigneeId === notifyId) {
    return true
  }

  const consigneeText = asPartyText(values.consignee).trim()
  const notifyText = asPartyText(values.notifyParty).trim()
  return (
    consigneeText.length > 0 &&
    notifyText.length > 0 &&
    consigneeText === notifyText
  )
}
