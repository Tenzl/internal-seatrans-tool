export const QUARANTINE_CARGO_OPTIONS = [
  {
    value: 'ONE_LEG',
    label: 'Loading or discharging only',
    fee: 100,
    trips: 1,
  },
  { value: 'BOTH_LEGS', label: 'Loading and discharging', fee: 200, trips: 2 },
  {
    value: 'OTHER',
    label: 'Other (water supply / repair / crew change ...)',
    fee: 0,
    trips: 0,
  },
] as const
