export interface PortDisplayData {
  name: string
  countryCode?: string | null
  code?: string | null
}

export function formatPortDisplay(port: PortDisplayData): string {
  const name = port.name.trim().toUpperCase()
  const country = port.countryCode?.trim().toUpperCase()
  const code = port.code?.trim().toUpperCase()

  if (country && code) return `${name}, ${country} (${code})`
  if (country) return `${name}, ${country}`
  if (code) return `${name} (${code})`
  return name
}
