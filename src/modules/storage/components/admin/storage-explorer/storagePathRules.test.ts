import type { StorageObject } from '@/modules/storage/types/storage.types'
import { describe, expect, it } from 'vitest'
import {
  buildRenamedStorageKey,
  folderPrefix,
  uploadedFilesLabel,
} from './storagePathRules'

const object = (type: StorageObject['type'], key: string): StorageObject =>
  ({
    type,
    key,
    name: key,
  }) as StorageObject

describe('storage path rules', () => {
  it('normalizes folder navigation without changing file keys', () => {
    expect(folderPrefix(object('folder', 'contracts'))).toBe('contracts/')
    expect(folderPrefix(object('folder', 'contracts/'))).toBe('contracts/')
    expect(folderPrefix(object('file', 'contracts/a.pdf'))).toBeNull()
  })

  it.each([
    ['folder', 'old/', 'new', 'new/'],
    ['folder', 'clients/old/', 'new', 'clients/new/'],
    ['file', 'old.pdf', 'new.pdf', 'new.pdf'],
    ['file', 'clients/old.pdf', 'new.pdf', 'clients/new.pdf'],
  ] as const)(
    'renames %s %s inside its current parent',
    (type, key, newName, expected) => {
      expect(buildRenamedStorageKey(object(type, key), newName)).toBe(expected)
    }
  )

  it('pluralizes upload feedback', () => {
    expect(uploadedFilesLabel(1)).toBe('1 file uploaded')
    expect(uploadedFilesLabel(2)).toBe('2 files uploaded')
  })
})
