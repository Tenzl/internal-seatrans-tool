/**
 * Cloudinary delivery-URL transforms for gallery (and other CDN images).
 * Inserts f_auto,q_auto[,w_*] after `/image/upload/` so thumbs/cards do not
 * download the full original before client resize.
 */

export type CloudinaryDeliveryVariant = 'thumb' | 'card' | 'full'

const CLOUDINARY_HOST = 'res.cloudinary.com'
const UPLOAD_MARKER = '/image/upload/'

/** Path segment that looks like Cloudinary transforms (e.g. f_auto,q_auto,w_96). */
const TRANSFORM_SEGMENT =
  /^(?:[a-z]+_[^,/\s]+(?:,[a-z]+_[^,/\s]+)*)$/i

const VARIANT_TRANSFORMS: Record<CloudinaryDeliveryVariant, string> = {
  // 48px UI @2x
  thumb: 'f_auto,q_auto,w_96,c_limit',
  card: 'f_auto,q_auto,w_800,c_limit',
  full: 'f_auto,q_auto,c_limit',
}

function isCloudinaryUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname
    return host === CLOUDINARY_HOST || host.endsWith(`.${CLOUDINARY_HOST}`)
  } catch {
    return false
  }
}

/**
 * Returns a Cloudinary delivery URL with the given variant transforms.
 * Non-Cloudinary URLs are returned unchanged.
 */
export function withCloudinaryDelivery(
  url: string,
  variant: CloudinaryDeliveryVariant = 'full'
): string {
  if (!url || !isCloudinaryUrl(url)) return url

  const markerIndex = url.indexOf(UPLOAD_MARKER)
  if (markerIndex === -1) return url

  const prefix = url.slice(0, markerIndex + UPLOAD_MARKER.length)
  let rest = url.slice(markerIndex + UPLOAD_MARKER.length)
  if (!rest) return url

  const slash = rest.indexOf('/')
  const firstSegment = slash === -1 ? rest : rest.slice(0, slash)
  if (TRANSFORM_SEGMENT.test(firstSegment) && !firstSegment.startsWith('v')) {
    rest = slash === -1 ? '' : rest.slice(slash + 1)
  }

  const transform = VARIANT_TRANSFORMS[variant]
  return rest ? `${prefix}${transform}/${rest}` : `${prefix}${transform}`
}
