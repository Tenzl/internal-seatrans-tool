/** Vietnamese shipowners: +8% VAT on Pilotage, Tug, Moor/Unmoor, Berth due, Other expenses. */
export const VN_SHIPOWNER_VAT_RATE = 0.08
export const VN_SHIPOWNER_VAT_FACTOR = 1 + VN_SHIPOWNER_VAT_RATE

export function isVietnameseShipowner(value: unknown): boolean {
  return String(value ?? '')
    .trim()
    .toUpperCase() === 'VIETNAMESE'
}

/** Multiply a resolved numeric fee by 1.08 when shipowner is Vietnamese. */
export function applyShipownerVat(amount: number, shipownerNationality: unknown): number {
  if (!Number.isFinite(amount)) return amount
  return isVietnameseShipowner(shipownerNationality) ? amount * VN_SHIPOWNER_VAT_FACTOR : amount
}

export function shipownerVatRemark(shipownerNationality: unknown): string {
  return isVietnameseShipowner(shipownerNationality) ? 'incl. 8% VAT' : ''
}

export function joinFeeRemarks(...parts: Array<string | undefined | null>): string {
  return parts
    .map((part) => String(part ?? '').trim())
    .filter(Boolean)
    .join(' ')
}

/** Format a tariff amount, applying +8% VAT for Vietnamese shipowners. */
export function formatFeeWithShipownerVat(
  value: number | null,
  formula: string,
  shipownerNationality: unknown,
  formatAmount: (n: number) => string,
): string {
  if (value === null) {
    return isVietnameseShipowner(shipownerNationality)
      ? `${formula}*1.08`
      : formula
  }
  return formatAmount(applyShipownerVat(value, shipownerNationality))
}
