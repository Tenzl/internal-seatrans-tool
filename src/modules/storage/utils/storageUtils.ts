import {
  Archive,
  File,
  FileAudio,
  FileCode,
  FileImage,
  FileSpreadsheet,
  FileText,
  FileVideo,
  Folder,
  type LucideIcon,
} from 'lucide-react'
import type { StorageObject } from '@/modules/storage/types/storage.types'

const PATH_SEP = '/'

/** Normalize prefix: no leading slash, trailing slash for non-empty folders. */
export function normalizePrefix(prefix: string): string {
  const trimmed = prefix.replace(/^\/+/, '').replace(/\/+$/, '')
  return trimmed ? `${trimmed}/` : ''
}

/** Join a prefix and child name into a full key. */
export function joinKey(prefix: string, name: string): string {
  const base = normalizePrefix(prefix)
  const child = name.replace(/^\/+/, '').replace(/\/+$/, '')
  return base ? `${base}${child}` : child
}

/** Parent prefix of a key, or empty string at root level. */
export function parentPrefixOf(key: string): string | null {
  const normalized = key.replace(/\/+$/, '')
  const idx = normalized.lastIndexOf('/')
  if (idx < 0) return null
  const parent = normalized.slice(0, idx)
  return parent ? `${parent}/` : ''
}

/** Basename of a key. */
export function basename(key: string): string {
  const normalized = key.replace(/\/+$/, '')
  const idx = normalized.lastIndexOf('/')
  return idx < 0 ? normalized : normalized.slice(idx + 1)
}

export function formatBytes(bytes?: number): string {
  if (bytes == null || Number.isNaN(bytes)) return '—'
  if (bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  const value = bytes / 1024 ** i
  return `${value < 10 && i > 0 ? value.toFixed(1) : Math.round(value)} ${units[i]}`
}

export function formatStorageDate(iso?: string): string {
  if (!iso) return '—'
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(iso))
  } catch {
    return iso
  }
}

function extOf(name: string): string {
  const dot = name.lastIndexOf('.')
  return dot > 0 ? name.slice(dot + 1).toLowerCase() : ''
}

export function iconForStorageObject(obj: StorageObject): LucideIcon {
  if (obj.type === 'folder') return Folder

  const ext = extOf(obj.name)
  const mime = (obj.contentType ?? '').toLowerCase()

  if (mime.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(ext)) {
    return FileImage
  }
  if (mime.startsWith('video/') || ['mp4', 'webm', 'mov', 'avi', 'mkv'].includes(ext)) {
    return FileVideo
  }
  if (mime.startsWith('audio/') || ['mp3', 'wav', 'ogg', 'flac', 'aac'].includes(ext)) {
    return FileAudio
  }
  if (['pdf', 'doc', 'docx', 'txt', 'rtf', 'md'].includes(ext) || mime.includes('pdf') || mime.includes('text')) {
    return FileText
  }
  if (['xls', 'xlsx', 'csv'].includes(ext) || mime.includes('spreadsheet') || mime.includes('excel')) {
    return FileSpreadsheet
  }
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext) || mime.includes('zip') || mime.includes('archive')) {
    return Archive
  }
  if (['js', 'ts', 'tsx', 'jsx', 'json', 'xml', 'html', 'css', 'py', 'java'].includes(ext)) {
    return FileCode
  }
  return File
}

/** Breadcrumb segments from a prefix. */
export function prefixSegments(prefix: string): { label: string; prefix: string }[] {
  const normalized = normalizePrefix(prefix)
  if (!normalized) return [{ label: 'Root', prefix: '' }]

  const parts = normalized.replace(/\/$/, '').split('/')
  const segments: { label: string; prefix: string }[] = [{ label: 'Root', prefix: '' }]
  let acc = ''
  for (const part of parts) {
    acc = acc ? `${acc}${part}/` : `${part}/`
    segments.push({ label: part, prefix: acc })
  }
  return segments
}

export { PATH_SEP }
