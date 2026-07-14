export const PORT_AREA_OPTIONS = [
  { value: '1', label: 'Ports of Area 1', shortLabel: 'Area 1' },
  { value: '2', label: 'Ports of Area 2', shortLabel: 'Area 2' },
  { value: '3', label: 'Ports of Area 3', shortLabel: 'Area 3' },
] as const

export type PortAreaCode = (typeof PORT_AREA_OPTIONS)[number]['value']

export function isPortAreaCode(value: unknown): value is PortAreaCode {
  return value === '1' || value === '2' || value === '3'
}

export function getPortAreaLabel(value: PortAreaCode): string {
  return PORT_AREA_OPTIONS.find((area) => area.value === value)?.label ?? value
}

export function getPortAreaShortLabel(value: PortAreaCode): string {
  return PORT_AREA_OPTIONS.find((area) => area.value === value)?.shortLabel ?? value
}
