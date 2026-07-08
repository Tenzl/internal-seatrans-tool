'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ChevronDown, ChevronRight, Folder, Loader2 } from 'lucide-react'
import { queryKeys } from '@/shared/config/react-query.config'
import { cn } from '@/shared/lib/utils'
import { storageService } from '@/modules/storage/services/storageService'
import type { StorageObject } from '@/modules/storage/types/storage.types'
import { normalizePrefix } from '@/modules/storage/utils/storageUtils'

interface StorageFolderTreeProps {
  currentPrefix: string
  onSelectPrefix: (prefix: string) => void
}

export function StorageFolderTree({ currentPrefix, onSelectPrefix }: StorageFolderTreeProps) {
  return (
    <ul className="space-y-0.5 text-sm" role="tree">
      <TreeNode
        prefix=""
        label="Root"
        depth={0}
        currentPrefix={currentPrefix}
        onSelectPrefix={onSelectPrefix}
        defaultExpanded
      />
    </ul>
  )
}

interface TreeNodeProps {
  prefix: string
  label: string
  depth: number
  currentPrefix: string
  onSelectPrefix: (prefix: string) => void
  defaultExpanded?: boolean
}

function TreeNode({
  prefix,
  label,
  depth,
  currentPrefix,
  onSelectPrefix,
  defaultExpanded = false,
}: TreeNodeProps) {
  const normalized = normalizePrefix(prefix)
  const isSelected = normalizePrefix(currentPrefix) === normalized
  const [expanded, setExpanded] = useState(defaultExpanded || isAncestor(normalized, currentPrefix))

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.storageList(normalized),
    queryFn: ({ signal }) => storageService.list(normalized, signal),
    enabled: expanded,
    staleTime: 60_000,
  })

  const childFolders = data?.folders ?? []
  const hasChildren = expanded && childFolders.length > 0

  return (
    <li role="treeitem" aria-expanded={expanded}>
      <div
        className="flex items-center"
        style={{ paddingLeft: depth * 12 }}
      >
        <button
          type="button"
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted"
          onClick={() => setExpanded((e) => !e)}
          aria-label={expanded ? 'Collapse' : 'Expand'}
        >
          {isLoading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : expanded ? (
            <ChevronDown className="h-3.5 w-3.5" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5" />
          )}
        </button>
        <button
          type="button"
          onClick={() => onSelectPrefix(normalized)}
          className={cn(
            'flex min-w-0 flex-1 items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors',
            isSelected ? 'bg-primary/10 font-medium text-primary' : 'hover:bg-muted',
          )}
        >
          <Folder className="h-3.5 w-3.5 shrink-0 text-amber-500" />
          <span className="truncate">{label}</span>
        </button>
      </div>

      {expanded && hasChildren && (
        <ul className="mt-0.5" role="group">
          {childFolders.map((folder: StorageObject) => (
            <TreeNode
              key={folder.key}
              prefix={folder.key}
              label={folder.name}
              depth={depth + 1}
              currentPrefix={currentPrefix}
              onSelectPrefix={onSelectPrefix}
            />
          ))}
        </ul>
      )}
    </li>
  )
}

function isAncestor(ancestorPrefix: string, descendantPrefix: string): boolean {
  if (!ancestorPrefix) return true
  return normalizePrefix(descendantPrefix).startsWith(normalizePrefix(ancestorPrefix))
}
