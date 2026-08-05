import { Plus } from 'lucide-react'

interface CategoryFeedbackProps {
  successMessage: string | null
  errorMessage: string | null
  onDismissSuccess: () => void
  onDismissError: () => void
}

export function CategoryFeedback({
  successMessage,
  errorMessage,
  onDismissSuccess,
  onDismissError,
}: CategoryFeedbackProps) {
  return (
    <>
      {successMessage && (
        <div className='flex items-center justify-between rounded-lg border-2 border-success bg-success/10 p-4 text-success'>
          <span className='font-medium'>{successMessage}</span>
          <button
            type='button'
            aria-label='Dismiss'
            onClick={onDismissSuccess}
            className='cursor-pointer'
          >
            <Plus className='h-4 w-4 rotate-45' />
          </button>
        </div>
      )}

      {errorMessage && (
        <div className='flex items-center justify-between rounded-lg border-2 border-red-500 bg-red-50 p-4 text-red-800'>
          <span className='font-medium'>{errorMessage}</span>
          <button
            type='button'
            aria-label='Dismiss'
            onClick={onDismissError}
            className='cursor-pointer'
          >
            <Plus className='h-4 w-4 rotate-45' />
          </button>
        </div>
      )}
    </>
  )
}
