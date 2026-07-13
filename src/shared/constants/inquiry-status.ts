export type InquiryStatus = 'PENDING' | 'PROCESSING' | 'QUOTED' | 'COMPLETED' | 'CANCELLED'

// Individual status constants
const STATUS_PENDING: InquiryStatus = 'PENDING'
const STATUS_PROCESSING: InquiryStatus = 'PROCESSING'
export const STATUS_QUOTED: InquiryStatus = 'QUOTED'
export const STATUS_COMPLETED: InquiryStatus = 'COMPLETED'
const STATUS_CANCELLED: InquiryStatus = 'CANCELLED'

export interface StatusBadgeConfig {
  variant: 'default' | 'secondary' | 'destructive' | 'outline'
  label: string
  className?: string
}

// Badge config for status display (used in tables/lists)
export const STATUS_BADGE_CONFIG: Record<InquiryStatus, StatusBadgeConfig> = {
  [STATUS_PENDING]: { variant: 'secondary', label: 'Pending' },
  [STATUS_PROCESSING]: { variant: 'default', label: 'Processing', className: 'bg-warning hover:bg-warning/90 text-warning-foreground' },
  [STATUS_QUOTED]: { variant: 'default', label: 'Quoted', className: 'bg-primary hover:bg-primary/90' },
  [STATUS_COMPLETED]: { variant: 'default', label: 'Completed', className: 'bg-success hover:bg-success/90 text-success-foreground' },
  [STATUS_CANCELLED]: { variant: 'destructive', label: 'Cancelled' },
}
