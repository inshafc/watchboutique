'use client'

import { useEffect, useRef, useState } from 'react'

const DOC_WIDTH_PX = 794 // 210mm at 96dpi, matching InvoicePrintLayout's fixed width

// Scales the fixed-width (210mm) invoice document down to fit whatever
// container it's placed in, instead of letting it overflow/clip — the bug
// where the preview "bleeds" off the edge on anything narrower than ~794px.
// Printing itself is unaffected: @media print resets the transform so the
// browser's print engine always gets the real, full-size A4 document.
export default function InvoiceScaleWrapper({ children }: { children: React.ReactNode }) {
  const outerRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  const [contentHeight, setContentHeight] = useState<number | null>(null)

  useEffect(() => {
    const outer = outerRef.current
    const inner = outer?.firstElementChild as HTMLElement | null
    if (!outer || !inner) return

    function measure() {
      if (!outer || !inner) return
      const containerWidth = outer.getBoundingClientRect().width
      const nextScale = containerWidth > 0 ? Math.min(1, containerWidth / DOC_WIDTH_PX) : 1
      // offsetHeight is the natural, untransformed layout height — unlike
      // getBoundingClientRect(), it isn't affected by the CSS scale() below,
      // so this never has to back-compute from an already-scaled value.
      setScale(nextScale)
      setContentHeight(inner.offsetHeight * nextScale)
    }

    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(outer)
    const roInner = new ResizeObserver(measure)
    roInner.observe(inner)
    return () => { ro.disconnect(); roInner.disconnect() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <>
      <style>{`
        @media print {
          .invoice-scale-wrapper, .invoice-scale-inner {
            transform: none !important;
            height: auto !important;
            width: auto !important;
          }
        }
      `}</style>
      <div ref={outerRef} className="invoice-scale-wrapper" style={{ width: '100%', height: contentHeight ?? undefined, overflow: 'hidden' }}>
        <div className="invoice-scale-inner" style={{ transform: `scale(${scale})`, transformOrigin: 'top left', width: DOC_WIDTH_PX }}>
          {children}
        </div>
      </div>
    </>
  )
}
