import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { Separator } from '@/components/ui/separator'
import { SidebarTrigger } from '@/components/ui/sidebar'

type HeaderProps = React.HTMLAttributes<HTMLElement> & {
  fixed?: boolean
  ref?: React.Ref<HTMLElement>
}

export function Header({ className, fixed, children, ...props }: HeaderProps) {
  const headerRef = useRef<HTMLElement>(null)
  const [offset, setOffset] = useState(0)

  useEffect(() => {
    const onScroll = () => {
      setOffset(document.body.scrollTop || document.documentElement.scrollTop)
    }

    // Add scroll listener to the body
    document.addEventListener('scroll', onScroll, { passive: true })

    // Clean up the event listener on unmount
    return () => document.removeEventListener('scroll', onScroll)
  }, [])

  // Expose the live header height so sticky page chrome (e.g. area tabs) can
  // offset below a wrapped mobile header instead of assuming a single 4rem row.
  useEffect(() => {
    const el = headerRef.current
    if (!el) return

    const syncHeight = () => {
      document.documentElement.style.setProperty(
        '--header-height',
        `${el.offsetHeight}px`,
      )
    }

    syncHeight()
    const observer = new ResizeObserver(syncHeight)
    observer.observe(el)
    return () => {
      observer.disconnect()
      document.documentElement.style.removeProperty('--header-height')
    }
  }, [])

  return (
    <header
      ref={headerRef}
      className={cn(
        'z-50 min-h-16 sm:h-16',
        fixed && 'header-fixed peer/header sticky top-0 w-[inherit]',
        offset > 10 && fixed ? 'shadow' : 'shadow-none',
        className
      )}
      {...props}
    >
      <div
        className={cn(
          'relative flex flex-wrap items-center gap-2 p-3 sm:h-full sm:flex-nowrap sm:gap-3 sm:p-4',
          offset > 10 &&
            fixed &&
            'after:absolute after:inset-0 after:-z-10 after:bg-background/95 max-md:after:backdrop-blur-none md:after:bg-background/20 md:after:backdrop-blur-lg'
        )}
      >
        <div className='flex shrink-0 items-center gap-2 sm:gap-3'>
          <SidebarTrigger variant='outline' className='min-h-11 min-w-11 active:scale-[0.98] max-lg:scale-100 md:min-h-8 md:min-w-8' />
          <Separator orientation='vertical' className='hidden h-6 sm:block' />
        </div>
        <div className='flex w-full min-w-0 flex-1 basis-full flex-wrap items-center gap-2 sm:basis-auto sm:flex-nowrap sm:gap-3 [&>:first-child]:w-full [&>:first-child]:sm:w-auto'>
          {children}
        </div>
      </div>
    </header>
  )
}
