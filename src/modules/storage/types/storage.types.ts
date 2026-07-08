/** Object storage node — mirrors S3/R2 list-objects semantics. */

export type StorageNodeType = 'folder' | 'file'

export interface StorageObject {
  /** Full object key, e.g. `documents/reports/file.pdf` */
  key: string
  /** Display name (last path segment) */
  name: string
  type: StorageNodeType
  size?: number
  contentType?: string
  lastModified?: string
  etag?: string
}

export interface StorageListResult {
  /** Current prefix (folder path), empty string = bucket root */
  prefix: string
  /** Parent prefix, null at root */
  parentPrefix: string | null
  folders: StorageObject[]
  files: StorageObject[]
}

export interface StorageRenameRequest {
  fromKey: string
  toKey: string
}

export interface StorageDownloadUrlResult {
  url: string
  expiresAt?: string
}
