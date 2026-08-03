'use client'

import { useState } from 'react'
import Image, { ImageProps } from 'next/image'

/**
 * Drop-in replacement for next/image's <Image>. next/image already lazy-loads
 * off-screen images by default; this adds the fade-in-on-load reveal so
 * images don't pop in abruptly once they cross the viewport.
 */
export default function LazyImage({ className = '', onLoad, ...props }: ImageProps) {
  const [loaded, setLoaded] = useState(false)

  return (
    // eslint-disable-next-line jsx-a11y/alt-text -- alt is required and forwarded via ImageProps
    <Image
      {...props}
      className={`${className} transition-opacity duration-500 ease-out ${loaded ? 'opacity-100' : 'opacity-0'}`}
      onLoad={(e) => {
        setLoaded(true)
        onLoad?.(e)
      }}
    />
  )
}
