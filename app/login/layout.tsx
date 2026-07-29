import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Pickleball League | Player Login',
  description: 'Pickleball League — player portal login.',
}

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
