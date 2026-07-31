import type { StorageObject } from '@/modules/storage/types/storage.types'
import { parentPrefixOf } from '@/modules/storage/utils/storageUtils'

export function folderPrefix(object: StorageObject): string | null {
  if (object.type !== 'folder') return null
  return object.key.endsWith('/') ? object.key : `${object.key}/`
}

export function buildRenamedStorageKey(
  object: StorageObject,
  newName: string
): string {
  const parent =
    object.type === 'folder'
      ? (parentPrefixOf(object.key) ?? '')
      : object.key.includes('/')
        ? object.key.slice(0, object.key.lastIndexOf('/') + 1)
        : ''

  if (object.type === 'folder') {
    return parent ? `${parent}${newName}/` : `${newName}/`
  }
  return parent ? `${parent}${newName}` : newName
}

export function uploadedFilesLabel(count: number): string {
  return count === 1 ? '1 file uploaded' : `${count} files uploaded`
}
