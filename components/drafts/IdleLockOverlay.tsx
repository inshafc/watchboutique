'use client'

export default function IdleLockOverlay({ onResume }: { onResume: () => void }) {
  return (
    <div
      className="fixed inset-0 z-[100] bg-gray-900/80 backdrop-blur-sm flex items-center justify-center cursor-pointer"
      onClick={onResume}
      role="button"
      tabIndex={0}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') onResume() }}
    >
      <div className="bg-white rounded-2xl px-8 py-6 text-center max-w-sm mx-4 shadow-2xl">
        <p className="text-sm font-semibold text-gray-900 mb-1">Session idle</p>
        <p className="text-sm text-gray-500 mb-4">Your work is saved. Click to resume.</p>
        <button
          type="button"
          onClick={onResume}
          className="bg-gray-900 text-white text-sm font-medium px-5 py-2.5 rounded-xl hover:bg-black transition-colors"
        >
          Resume
        </button>
      </div>
    </div>
  )
}
