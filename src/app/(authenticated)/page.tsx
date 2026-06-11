import { redirect } from 'next/navigation'

// The dashboard default landing page is Create EPDA.
export default function RootPage() {
  redirect('/epda/create-epda')
}
