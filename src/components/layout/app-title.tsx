import { Link } from '@/lib/router'
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar'

export function AppTitle() {
  const { setOpenMobile } = useSidebar()
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton
          size='lg'
          className='gap-2 hover:bg-transparent active:bg-transparent'
          asChild
        >
          <Link
            to='/'
            onClick={() => setOpenMobile(false)}
            className='flex items-center gap-2'
          >
            <div className='flex aspect-square size-9 items-center justify-center overflow-hidden rounded-lg bg-white'>
              <img
                src='/landing-image/web_Logo.png'
                alt='SEATRANS'
                className='size-8 object-contain'
              />
            </div>
            <div className='grid flex-1 text-start leading-tight'>
              <span className='truncate text-sm font-bold'>SEATRANS</span>
              <span className='truncate text-xs text-muted-foreground'>
                Shipping Agency
              </span>
            </div>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
