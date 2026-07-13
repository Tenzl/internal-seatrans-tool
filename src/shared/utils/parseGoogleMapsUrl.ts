/**
 * Parse latitude/longitude out of a Google Maps URL.
 *
 * Priority order (matches what Google actually uses):
 *   1. `!3d<lat>!4d<lng>` — the canonical place pin (most accurate)
 *   2. `@<lat>,<lng>,<zoom>z` — the map viewport center
 *   3. `?q=<lat>,<lng>` / `?ll=<lat>,<lng>` / `?query=<lat>,<lng>` — share URL
 *
 * Short links (goo.gl/maps, maps.app.goo.gl) intentionally return a `shortLink`
 * error because they require following a redirect that browsers block via CORS.
 */
export type ParseMapsErrorCode =
  | 'empty'
  | 'shortLink'
  | 'noCoordinates'
  | 'outOfRange'
  | 'invalidUrl'

export interface ParsedMapsResult {
  ok: true
  lat: number
  lng: number
  source: 'pin' | 'viewport' | 'query'
}

export interface ParseMapsError {
  ok: false
  code: ParseMapsErrorCode
  message: string
}

const LAT_BOUNDS = 90
const LNG_BOUNDS = 180

const SHORT_LINK_HOSTS = ['goo.gl', 'maps.app.goo.gl']

function isShortLink(url: string): boolean {
  const lower = url.trim().toLowerCase()
  return SHORT_LINK_HOSTS.some(
    (host) => lower.startsWith(`https://${host}/`) || lower.startsWith(`http://${host}/`),
  )
}

function isValid(lat: number, lng: number): boolean {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    Math.abs(lat) <= LAT_BOUNDS &&
    Math.abs(lng) <= LNG_BOUNDS
  )
}

export function parseGoogleMapsUrl(input: string): ParsedMapsResult | ParseMapsError {
  const url = (input ?? '').trim()
  if (!url) {
    return { ok: false, code: 'empty', message: 'Paste a Google Maps URL.' }
  }

  if (isShortLink(url)) {
    return {
      ok: false,
      code: 'shortLink',
      message:
        'Short links (goo.gl / maps.app.goo.gl) are not supported. Open the location in Google Maps and copy the full URL from the address bar.',
    }
  }

  const pin = url.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/)
  if (pin) {
    const lat = parseFloat(pin[1])
    const lng = parseFloat(pin[2])
    if (isValid(lat, lng)) return { ok: true, lat, lng, source: 'pin' }
    return { ok: false, code: 'outOfRange', message: 'Coordinates are outside the valid range.' }
  }

  const at = url.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/)
  if (at) {
    const lat = parseFloat(at[1])
    const lng = parseFloat(at[2])
    if (isValid(lat, lng)) return { ok: true, lat, lng, source: 'viewport' }
    return { ok: false, code: 'outOfRange', message: 'Coordinates are outside the valid range.' }
  }

  const queryEncoded = url.match(/[?&](?:q|ll|query)=(-?\d+(?:\.\d+)?)%2C(-?\d+(?:\.\d+)?)/i)
  if (queryEncoded) {
    const lat = parseFloat(queryEncoded[1])
    const lng = parseFloat(queryEncoded[2])
    if (isValid(lat, lng)) return { ok: true, lat, lng, source: 'query' }
  }

  const queryPlain = url.match(/[?&](?:q|ll|query)=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/)
  if (queryPlain) {
    const lat = parseFloat(queryPlain[1])
    const lng = parseFloat(queryPlain[2])
    if (isValid(lat, lng)) return { ok: true, lat, lng, source: 'query' }
  }

  if (!url.toLowerCase().includes('google.') && !url.toLowerCase().includes('/maps')) {
    return {
      ok: false,
      code: 'invalidUrl',
      message: 'That does not look like a Google Maps URL.',
    }
  }

  return {
    ok: false,
    code: 'noCoordinates',
    message:
      'Could not find coordinates in this URL. Click on the place pin in Google Maps, then copy the full URL again.',
  }
}
