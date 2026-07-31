import { Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ImageDropzone } from '@/components/ui/file-upload'

interface GalleryUploadFormProps {
  hasSelectedCommodity: boolean
  selectedFiles: File[]
  dropzoneResetKey: number
  canUpload: boolean
  isUploading: boolean
  onFilesChange: (files: File[]) => void
  onUpload: () => void
}

export function GalleryUploadForm({
  hasSelectedCommodity,
  selectedFiles,
  dropzoneResetKey,
  canUpload,
  isUploading,
  onFilesChange,
  onUpload,
}: GalleryUploadFormProps) {
  return (
    <>
      <div>
        <label className='mb-2 flex items-center gap-2 font-semibold'>
          <Upload className='h-4 w-4 text-primary' />
          Select files <span className='text-red-500'>*</span>
        </label>

        <ImageDropzone
          key={dropzoneResetKey}
          onFilesChange={onFilesChange}
          disabled={!hasSelectedCommodity}
          maxFiles={20}
          maxFileSize={10 * 1024 * 1024}
          hint='PNG, JPG, WebP up to 10MB each'
        />

        {!hasSelectedCommodity && (
          <p className='mt-2 text-sm text-muted-foreground'>
            Complete area, port, service, and cargo filters on the left before
            choosing files.
          </p>
        )}
      </div>

      <div className='border-t pt-4'>
        <Button
          onClick={onUpload}
          disabled={!canUpload || isUploading}
          className='w-full cursor-pointer disabled:cursor-not-allowed'
          size='lg'
        >
          {isUploading ? (
            <>Uploading...</>
          ) : (
            <>
              <Upload className='mr-2 h-4 w-4' />
              Upload{' '}
              {selectedFiles.length > 0 && `${selectedFiles.length} File(s)`}
            </>
          )}
        </Button>
        {!canUpload && !isUploading && (
          <p className='mt-2 text-center text-sm text-muted-foreground'>
            Complete filters and select files to enable upload
          </p>
        )}
      </div>
    </>
  )
}
