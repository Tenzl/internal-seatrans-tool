export function resolveQnCargoQuarantineMode(
  enabled: boolean,
  purpose: string
): 'ONE_LEG' | 'BOTH_LEGS' | 'OTHER' {
  if (!enabled || purpose === 'MUC_DICH_KHAC') return 'OTHER'
  if (purpose === 'NHAP_XUAT') return 'BOTH_LEGS'
  return 'ONE_LEG'
}
