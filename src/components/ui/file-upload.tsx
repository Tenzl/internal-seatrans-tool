'use client'

import { FileUpload } from '@ark-ui/react/file-upload'
import { Image as ImageIcon, UploadCloud, X } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface ImageDropzoneProps {
  /** Bubbles the current accepted files on every add/remove/clear. */
  onFilesChange?: (files: File[]) => void
  accept?: string
  maxFiles?: number
  /** Max bytes per file. Files above this are rejected by Ark UI. */
  maxFileSize?: number
  disabled?: boolean
  className?: string
  hint?: string
}

/**
 * Styled image dropzone built on Ark UI's FileUpload. Drag & drop or click to
 * browse, with per-file image previews, size, and remove/clear controls.
 * Uses the app's theme tokens so it follows light/dark mode automatically.
 *
 * It owns the file selection state internally; mirror it to the parent via
 * `onFilesChange`. To reset after a successful upload, remount with a changing
 * `key` prop.
 */
export function ImageDropzone({
  onFilesChange,
  accept = 'image/*',
  maxFiles = 20,
  maxFileSize = 10 * 1024 * 1024,
  disabled,
  className,
  hint = 'PNG, JPG, WebP up to 10MB each',
}: ImageDropzoneProps) {
  return (
    <FileUpload.Root
      maxFiles={maxFiles}
      maxFileSize={maxFileSize}
      accept={accept}
      disabled={disabled}
      onFileChange={(details) => onFilesChange?.(details.acceptedFiles)}
      className={cn('flex flex-col gap-4', className)}
    >
      <FileUpload.Context>
        {({ acceptedFiles }) => (
          <>
            <FileUpload.Dropzone
              className={cn(
                'flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-muted/30 px-6 py-10 text-center transition-colors',
                disabled
                  ? 'cursor-not-allowed opacity-60'
                  : 'cursor-pointer hover:bg-muted/60',
              )}
            >
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full border bg-background">
                <UploadCloud className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium">
                <span className="text-primary">Click to upload</span>
                <span className="text-muted-foreground"> or drag &amp; drop</span>
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
            </FileUpload.Dropzone>

            {acceptedFiles.length > 0 && (
              <div className="space-y-3">
                <FileUpload.ItemGroup className="space-y-2">
                  {acceptedFiles.map((file) => (
                    <FileUpload.Item
                      key={`${file.name}-${file.size}`}
                      file={file}
                      className="flex items-center gap-3 rounded-lg border bg-card p-2.5"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted">
                        {file.type.startsWith('image/') ? (
                          <FileUpload.ItemPreview type="image/*">
                            <FileUpload.ItemPreviewImage className="h-full w-full object-cover" />
                          </FileUpload.ItemPreview>
                        ) : (
                          <ImageIcon className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <FileUpload.ItemName className="block truncate text-sm font-medium" />
                        <FileUpload.ItemSizeText className="text-xs text-muted-foreground" />
                      </div>

                      <FileUpload.ItemDeleteTrigger
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-destructive"
                        aria-label="Remove file"
                      >
                        <X className="h-4 w-4" />
                      </FileUpload.ItemDeleteTrigger>
                    </FileUpload.Item>
                  ))}
                </FileUpload.ItemGroup>

                <FileUpload.ClearTrigger className="inline-flex items-center rounded-md border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                  Remove all
                </FileUpload.ClearTrigger>
              </div>
            )}
          </>
        )}
      </FileUpload.Context>

      <FileUpload.HiddenInput />
    </FileUpload.Root>
  )
}

export interface StorageFileDropzoneProps {
  onFilesChange?: (files: File[]) => void
  accept?: string
  maxFiles?: number
  maxFileSize?: number
  disabled?: boolean
  className?: string
  hint?: string
}

/**
 * Generic file dropzone for object storage uploads (any MIME type).
 * Gallery images should keep using {@link ImageDropzone} + Cloudinary.
 */
export function StorageFileDropzone({
  onFilesChange,
  accept,
  maxFiles = 50,
  maxFileSize = 100 * 1024 * 1024,
  disabled,
  className,
  hint = 'Any file type, up to 100MB each',
}: StorageFileDropzoneProps) {
  return (
    <FileUpload.Root
      maxFiles={maxFiles}
      maxFileSize={maxFileSize}
      accept={accept}
      disabled={disabled}
      onFileChange={(details) => onFilesChange?.(details.acceptedFiles)}
      className={cn('flex flex-col gap-4', className)}
    >
      <FileUpload.Context>
        {({ acceptedFiles }) => (
          <>
            <FileUpload.Dropzone
              className={cn(
                'flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-muted/30 px-6 py-10 text-center transition-colors',
                disabled
                  ? 'cursor-not-allowed opacity-60'
                  : 'cursor-pointer hover:bg-muted/60',
              )}
            >
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full border bg-background">
                <UploadCloud className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium">
                <span className="text-primary">Click to upload</span>
                <span className="text-muted-foreground"> or drag &amp; drop</span>
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
            </FileUpload.Dropzone>

            {acceptedFiles.length > 0 && (
              <div className="space-y-3">
                <FileUpload.ItemGroup className="max-h-48 space-y-2 overflow-y-auto">
                  {acceptedFiles.map((file) => (
                    <FileUpload.Item
                      key={`${file.name}-${file.size}-${file.lastModified}`}
                      file={file}
                      className="flex items-center gap-3 rounded-lg border bg-card p-2.5"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted">
                        <ImageIcon className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <FileUpload.ItemName className="block truncate text-sm font-medium" />
                        <FileUpload.ItemSizeText className="text-xs text-muted-foreground" />
                      </div>
                      <FileUpload.ItemDeleteTrigger
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-destructive"
                        aria-label="Remove file"
                      >
                        <X className="h-4 w-4" />
                      </FileUpload.ItemDeleteTrigger>
                    </FileUpload.Item>
                  ))}
                </FileUpload.ItemGroup>
                <FileUpload.ClearTrigger className="inline-flex items-center rounded-md border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                  Remove all
                </FileUpload.ClearTrigger>
              </div>
            )}
          </>
        )}
      </FileUpload.Context>

      <FileUpload.HiddenInput />
    </FileUpload.Root>
  )
}
