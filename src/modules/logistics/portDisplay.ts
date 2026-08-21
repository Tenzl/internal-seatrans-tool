export interface PortDisplayData {
  name: string
  countryCode?: string | null
  code?: string | null
}

export interface PortDisplayOption {
  key: string
  kind: 'main' | 'sub'
  name: string
  label: string
}

export function formatPortDisplay(
  port: PortDisplayData,
  selectedName = port.name
): string {
  const name = selectedName.trim().toUpperCase()
  const country = port.countryCode?.trim().toUpperCase()
  const code = port.code?.trim().toUpperCase()

  if (country && code) return `${name}, ${country} (${code})`
  if (country) return `${name}, ${country}`
  if (code) return `${name} (${code})`
  return name
}

export function buildPortDisplayOptions(
  port: PortDisplayData & {
    id: number
    subName1?: string | null
    subName2?: string | null
  }
): PortDisplayOption[] {
  const names = [port.name, port.subName1, port.subName2]
  const seen = new Set<string>()

  return names.flatMap((candidate, index) => {
    const name = candidate?.trim()
    if (!name) return []
    const identity = name.toLocaleLowerCase()
    if (seen.has(identity)) return []
    seen.add(identity)

    return [
      {
        key: `${port.id}-${index === 0 ? 'main' : `sub-${index}`}`,
        kind: index === 0 ? ('main' as const) : ('sub' as const),
        name,
        label: formatPortDisplay(port, name),
      },
    ]
  })
}
