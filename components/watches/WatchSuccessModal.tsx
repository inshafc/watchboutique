'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  type:      'new' | 'edit'
  watchId:   string
  watchName: string
  reference: string | null
  onClose:   () => void
}

export default function WatchSuccessModal({ type, watchId, watchName, reference, onClose }: Props) {
  const router      = useRouter()
  const timerRef    = useRef<ReturnType<typeof setTimeout>>()
  const delay       = type === 'new' ? 4000 : 3000

  const goInventory = () => router.push(`/dashboard/inventory?highlight=${watchId}`)
  const goWatch     = () => router.push(`/dashboard/watches/${watchId}`)

  useEffect(() => {
    timerRef.current = setTimeout(() => {
      if (type === 'new') {
        goInventory()
      } else {
        onClose()
      }
    }, delay)
    return () => clearTimeout(timerRef.current)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleViewWatch() {
    clearTimeout(timerRef.current)
    goWatch()
  }

  function handleBackToInventory() {
    clearTimeout(timerRef.current)
    goInventory()
  }

  return (
    <>
      {/* Poppins for heading */}
      <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@600&display=swap" rel="stylesheet" />

      {/* Overlay */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-8 text-center">

          {/* Animated checkmark */}
          <div className="flex justify-center mb-5">
            <svg viewBox="0 0 54 54" className="w-20 h-20" fill="none">
              <circle
                cx="27" cy="27" r="25"
                stroke="#22c55e"
                strokeWidth="1.8"
                style={{
                  strokeDasharray: 160,
                  strokeDashoffset: 160,
                  animation: 'draw-circle 0.45s ease forwards',
                }}
              />
              <path
                d="M16 28l8 8 14-14"
                stroke="#22c55e"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{
                  strokeDasharray: 55,
                  strokeDashoffset: 55,
                  animation: 'draw-check 0.35s ease 0.35s forwards',
                }}
              />
            </svg>
          </div>

          {/* Heading */}
          <h2
            className="text-lg font-semibold text-gray-900 mb-1.5"
            style={{ fontFamily: "'Poppins', sans-serif" }}
          >
            {type === 'new' ? 'Watch Added Successfully' : 'Watch Updated Successfully'}
          </h2>

          {/* Watch info */}
          <p className="text-sm text-gray-500 truncate">{watchName}</p>
          {reference && <p className="text-xs text-gray-400 mt-0.5">Ref: {reference}</p>}

          {/* Auto-dismiss progress bar */}
          <div className="mt-5 mb-5 h-0.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-400 rounded-full"
              style={{
                animation: `countdown-shrink ${delay}ms linear forwards`,
                width: '100%',
              }}
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleBackToInventory}
              className="flex-1 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
            >
              Back to Inventory
            </button>
            <button
              type="button"
              onClick={handleViewWatch}
              className="flex-1 py-2.5 text-sm font-semibold text-white bg-gray-900 hover:bg-black rounded-xl transition-colors"
            >
              View Watch
            </button>
          </div>

        </div>
      </div>

      {/* Inline keyframe for countdown bar */}
      <style>{`
        @keyframes countdown-shrink {
          from { width: 100%; }
          to   { width: 0%; }
        }
      `}</style>
    </>
  )
}
