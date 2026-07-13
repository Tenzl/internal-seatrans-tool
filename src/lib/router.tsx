'use client'

/**
 * Compatibility shim that re-implements the small slice of the
 * `@tanstack/react-router` API the shadcn-admin template uses, backed by
 * Next.js (`next/navigation` + `next/link`). Template/layout components import
 * router primitives from here instead of `@tanstack/react-router` so they keep
 * working after the Vite -> Next.js migration with minimal edits.
 *
 * Feature code ported from the legacy Next.js app should import directly from
 * `next/navigation` / `next/link` — this shim exists only for the template.
 */
import {
  forwardRef,
  type AnchorHTMLAttributes,
  type ReactNode,
} from 'react'
import NextLink from 'next/link'
import {
  usePathname,
  useRouter as useNextRouter,
  useSearchParams,
} from 'next/navigation'

type SearchRecord = Record<string, unknown>

/** Decode a single query-string value back into a JS value (number/array/bool/object/string). */
function decodeValue(raw: string): unknown {
  try {
    return JSON.parse(raw)
  } catch {
    return raw
  }
}

/** Encode a JS value into a query-string value. Strings are kept raw; everything else JSON-encoded. */
function encodeValue(value: unknown): string {
  if (typeof value === 'string') return value
  return JSON.stringify(value)
}

export function parseSearch(
  params: URLSearchParams | { forEach: (cb: (v: string, k: string) => void) => void }
): SearchRecord {
  const out: SearchRecord = {}
  params.forEach((value, key) => {
    out[key] = decodeValue(value)
  })
  return out
}

export function serializeSearch(search: SearchRecord | undefined | null): string {
  if (!search) return ''
  const sp = new URLSearchParams()
  for (const [key, value] of Object.entries(search)) {
    if (value === undefined || value === null) continue
    if (Array.isArray(value) && value.length === 0) continue
    sp.set(key, encodeValue(value))
  }
  return sp.toString()
}

/** Substitute `$param` placeholders in a path (TanStack-style dynamic segments). */
function applyParams(path: string, params?: Record<string, string | number>): string {
  if (!params) return path
  let out = path
  for (const [key, value] of Object.entries(params)) {
    out = out.replaceAll(`$${key}`, String(value))
  }
  return out
}

type SearchInput =
  | true
  | SearchRecord
  | ((prev: SearchRecord) => SearchRecord)

export type NavigateOptions = {
  to?: string
  params?: Record<string, string | number>
  search?: SearchInput
  hash?: string
  replace?: boolean
}

function buildHref(
  opts: NavigateOptions,
  current: { pathname: string; search: SearchRecord }
): string {
  const basePath = applyParams(opts.to ?? current.pathname, opts.params)

  let nextSearch: SearchRecord
  if (typeof opts.search === 'function') {
    nextSearch = opts.search(current.search)
  } else if (opts.search === true) {
    nextSearch = current.search
  } else if (opts.search && typeof opts.search === 'object') {
    nextSearch = opts.search
  } else {
    // No search provided: clear when navigating to a new path, keep when staying.
    nextSearch = opts.to ? {} : current.search
  }

  const qs = serializeSearch(nextSearch)
  const hash = opts.hash ? `#${opts.hash}` : ''
  return `${basePath}${qs ? `?${qs}` : ''}${hash}`
}

export type NavigateFn = (opts: NavigateOptions) => void

export function useNavigate(): NavigateFn {
  const router = useNextRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  return (opts: NavigateOptions) => {
    const href = buildHref(opts ?? {}, {
      pathname,
      search: parseSearch(searchParams),
    })
    if (opts?.replace) router.replace(href)
    else router.push(href)
  }
}

type LocationObject = {
  pathname: string
  search: SearchRecord
  searchStr: string
  href: string
  hash: string
}

export function useLocation<T = LocationObject>(opts?: {
  select?: (location: LocationObject) => T
}): T {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const searchStr = searchParams.toString()
  const location: LocationObject = {
    pathname,
    search: parseSearch(searchParams),
    searchStr,
    href: `${pathname}${searchStr ? `?${searchStr}` : ''}`,
    hash: '',
  }
  return (opts?.select ? opts.select(location) : location) as T
}

export function useSearch<T = SearchRecord>(_opts?: { from?: string }): T {
  const searchParams = useSearchParams()
  return parseSearch(searchParams) as T
}

export function useRouter() {
  const router = useNextRouter()
  return {
    navigate: ((opts: NavigateOptions) => {
      // Lightweight navigate that doesn't depend on current search.
      const href = buildHref(opts ?? {}, { pathname: '', search: {} })
      if (opts?.replace) router.replace(href)
      else router.push(href)
    }) as NavigateFn,
    history: {
      go: (delta: number) => {
        if (typeof window !== 'undefined') window.history.go(delta)
      },
      back: () => router.back(),
      forward: () => router.forward(),
    },
  }
}

export type LinkProps = {
  to?: string
  params?: Record<string, string | number>
  search?: SearchRecord
  hash?: string
  replace?: boolean
} & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> & {
    children?: ReactNode
  }

export const Link = forwardRef<HTMLAnchorElement, LinkProps>(function Link(
  { to, params, search, hash, replace, children, ...rest },
  ref
) {
  const basePath = applyParams(to ?? '#', params)
  const qs = search ? serializeSearch(search) : ''
  const href = `${basePath}${qs ? `?${qs}` : ''}${hash ? `#${hash}` : ''}`
  return (
    <NextLink ref={ref} href={href} replace={replace} {...rest}>
      {children}
    </NextLink>
  )
})
