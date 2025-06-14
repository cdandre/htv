'use client'

import Image from 'next/image'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'

export default function HTVLogo({ className = "h-8 w-auto" }: { className?: string }) {
  const { theme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    // Return default logo during SSR
    return (
      <div className={className}>
        <Image
          src="/htv-logo.png"
          alt="HTV Logo"
          width={120}
          height={40}
          className="h-full w-auto"
          priority
        />
      </div>
    )
  }

  const currentTheme = theme === 'system' ? resolvedTheme : theme
  const logoSrc = currentTheme === 'dark' ? '/htv-logo-light.png' : '/htv-logo.png'

  return (
    <div className={className}>
      <Image
        src={logoSrc}
        alt="HTV Logo"
        width={120}
        height={40}
        className="h-full w-auto"
        priority
      />
    </div>
  )
}