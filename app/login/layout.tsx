import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'TWB Brain — Login',
  description: 'TWB Brain — internal ERP for The Watch Boutique. Inventory, sales, clients, and invoicing in one place.',
}

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
