import { redirect } from 'next/navigation'

/** Legacy route — Data Management commodities moved to /data/commodities. */
export default function Page() {
  redirect('/data/commodities')
}
