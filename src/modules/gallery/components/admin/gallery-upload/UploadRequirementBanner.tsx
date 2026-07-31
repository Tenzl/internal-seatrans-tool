import { AlertCircle } from 'lucide-react'
import { getUploadRequirement } from './galleryUploadRules'

interface UploadRequirementBannerProps {
  currentCount: number
  requiredCount: number
}

export function UploadRequirementBanner({
  currentCount,
  requiredCount,
}: UploadRequirementBannerProps) {
  const requirement = getUploadRequirement(currentCount, requiredCount)

  return (
    <div
      className={`flex items-center gap-2 rounded-lg p-3 ${
        requirement.complete
          ? 'bg-success/10 text-success'
          : 'bg-warning/10 text-warning'
      }`}
    >
      <AlertCircle className='h-4 w-4' />
      <span className='text-sm'>{requirement.message}</span>
    </div>
  )
}
