'use client'

import { useEffect } from 'react'

export default function PrintAutoTrigger() {
  useEffect(() => {
    const timer = setTimeout(() => window.print(), 500)
    return () => clearTimeout(timer)
  }, [])
  return null
}
