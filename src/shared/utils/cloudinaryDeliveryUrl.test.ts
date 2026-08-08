import { describe, expect, it } from 'vitest'
import { withCloudinaryDelivery } from './cloudinaryDeliveryUrl'

describe('withCloudinaryDelivery', () => {
  const original =
    'https://res.cloudinary.com/demo/image/upload/v1/folder/photo.jpg'

  it('leaves non-Cloudinary URLs alone', () => {
    expect(withCloudinaryDelivery('https://cdn.example/a.jpg', 'thumb')).toBe(
      'https://cdn.example/a.jpg'
    )
    expect(withCloudinaryDelivery('/relative.jpg', 'card')).toBe('/relative.jpg')
  })

  it('inserts thumb/card/full transforms after /image/upload/', () => {
    expect(withCloudinaryDelivery(original, 'thumb')).toContain(
      '/upload/f_auto,q_auto,w_96,c_limit/v1/'
    )
    expect(withCloudinaryDelivery(original, 'card')).toContain(
      '/upload/f_auto,q_auto,w_800,c_limit/v1/'
    )
    expect(withCloudinaryDelivery(original, 'full')).toContain(
      '/upload/f_auto,q_auto,c_limit/v1/'
    )
  })
})
