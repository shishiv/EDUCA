'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'

export function DevAuthBypass() {
  const [isEnabled, setIsEnabled] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    setIsEnabled(localStorage.getItem('dev_auth_bypass') === 'true')
  }, [])

  const enableBypass = () => {
    localStorage.setItem('dev_auth_bypass', 'true')
    setIsEnabled(true)
    window.location.reload()
  }

  const disableBypass = () => {
    localStorage.removeItem('dev_auth_bypass')
    setIsEnabled(false)
    window.location.reload()
  }

  if (!mounted) {
    return null
  }

  return (
    <div className="fixed bottom-4 right-4 bg-yellow-100 p-4 border border-yellow-300 rounded shadow-lg z-50">
      <div className="text-sm mb-2">
        Dev Auth Bypass: {isEnabled ? 'ON' : 'OFF'}
      </div>
      <div className="space-x-2">
        <Button size="sm" onClick={enableBypass} disabled={isEnabled}>
          Enable
        </Button>
        <Button size="sm" variant="outline" onClick={disableBypass} disabled={!isEnabled}>
          Disable
        </Button>
      </div>
    </div>
  )
}