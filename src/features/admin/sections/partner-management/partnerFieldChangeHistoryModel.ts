export type PartnerFieldChangeAction =
  | 'PARTNER_CREATE'
  | 'PARTNER_UPDATE'
  | 'PARTNER_LOCK'

export type PartnerFieldChangeLogEntry = {
  id: number
  partnerId: number
  action: PartnerFieldChangeAction
  fieldName: string
  previousValue: string | null
  newValue: string | null
  createdAt: string
  changedBy: {
    id: number
    fullName: string | null
    email: string | null
  }
}

const ACTION_LABELS: Record<PartnerFieldChangeAction, string> = {
  PARTNER_CREATE: 'Create partner',
  PARTNER_UPDATE: 'Update partner',
  PARTNER_LOCK: 'Lock edit',
}

export function formatPartnerFieldChangeAction(
  action: PartnerFieldChangeAction | string
): string {
  return ACTION_LABELS[action as PartnerFieldChangeAction] ?? action
}
