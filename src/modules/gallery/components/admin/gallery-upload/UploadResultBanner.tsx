import { X } from 'lucide-react'
import type { GalleryUploadResult } from './galleryUploadRules'

interface UploadResultBannerProps {
  result: GalleryUploadResult
  onDismiss: () => void
}

export function UploadResultBanner({
  result,
  onDismiss,
}: UploadResultBannerProps) {
  return (
    <div
      className={`rounded-lg border p-4 ${
        result.failed === 0
          ? 'border-success/30 bg-success/10'
          : 'border-warning/30 bg-warning/10'
      }`}
    >
      <div className='flex items-start justify-between'>
        <div className='flex-1'>
          <p className='font-semibold'>
            Upload Complete: {result.success} uploaded, {result.failed} failed
          </p>
          {result.failed > 0 && result.errors.length > 0 && (
            <div className='mt-2 text-sm'>
              <p className='mb-1 font-medium'>Errors:</p>
              <ul className='list-inside list-disc space-y-1'>
                {result.errors.slice(0, 3).map((error, index) => (
                  <li key={index} className='text-red-700'>
                    {error}
                  </li>
                ))}
                {result.errors.length > 3 && (
                  <li>...and {result.errors.length - 3} more</li>
                )}
              </ul>
            </div>
          )}
        </div>
        <button
          type='button'
          onClick={onDismiss}
          className='cursor-pointer'
          aria-label='Close upload result'
          title='Close upload result'
        >
          <X className='h-5 w-5' />
        </button>
      </div>
    </div>
  )
}
