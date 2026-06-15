import {
  FileText,
  AudioWaveform,
  Command,
  GalleryVerticalEnd,
  Users,
  BriefcaseBusiness,
  Ship,
  Database,
  Anchor,
  Package,
  Image,
  Building2,
  Newspaper,
  Tag,
} from 'lucide-react'
import { type SidebarData } from '../types'

export const sidebarData: SidebarData = {
  user: {
    name: 'satnaing',
    email: 'satnaingdev@gmail.com',
    avatar: '/avatars/shadcn.jpg',
  },
  teams: [
    {
      name: 'Shadcn Admin',
      logo: Command,
      plan: 'Vite + ShadcnUI',
    },
    {
      name: 'Acme Inc',
      logo: GalleryVerticalEnd,
      plan: 'Enterprise',
    },
    {
      name: 'Acme Corp.',
      logo: AudioWaveform,
      plan: 'Startup',
    },
  ],
  navGroups: [
    {
      title: 'General',
      items: [
        // Template demo items temporarily disabled (Dashboard, Tasks, Apps, Chats, Users).
        {
          title: 'EPDA',
          icon: FileText,
          items: [
            {
              title: 'Create EPDA',
              url: '/epda/create-epda',
            },
            {
              title: 'Inquiry',
              url: '/epda/inquiry',
            },
            {
              title: 'Parameter',
              url: '/epda/parameter',
            },
          ],
        },
        {
          title: 'Booking Management',
          icon: BriefcaseBusiness,
          items: [
            {
              title: 'Partner',
              icon: BriefcaseBusiness,
              url: '/booking/partner',
            },
            {
              title: 'Shipment',
              icon: Ship,
              url: '/booking/shipping',
            },
          ],
        },
        {
          title: 'Data Management',
          icon: Database,
          items: [
            {
              title: 'Users',
              icon: Users,
              url: '/users',
            },
            {
              title: 'Ports',
              icon: Anchor,
              url: '/data/ports',
            },
            {
              title: 'Cargo',
              icon: Package,
              url: '/data/cargo',
            },
            {
              title: 'Images',
              icon: Image,
              url: '/data/images',
            },
            {
              title: 'Offices',
              icon: Building2,
              url: '/data/offices',
            },
          ],
        },
        {
          title: 'Content Management',
          icon: Newspaper,
          items: [
            {
              title: 'Posts',
              icon: Newspaper,
              url: '/content/posts',
            },
            {
              title: 'Categories',
              icon: Tag,
              url: '/content/categories',
            },
          ],
        },
      ],
    },
  ],
}
