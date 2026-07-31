import { ArrowUpDown } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function GallerySortableColumnHeader({
  label,
  onToggle,
  descending,
}: {
  label: string
  onToggle: (descending: boolean) => void
  descending: boolean
}) {
  return (
    <Button
      variant='ghost'
      className='px-0 hover:bg-transparent'
      onClick={() => onToggle(descending)}
    >
      {label}
      <ArrowUpDown className='ml-2 h-4 w-4' />
    </Button>
  )
}
