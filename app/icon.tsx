import { ImageResponse } from 'next/og'

export const size = { width: 32, height: 32 }
export const contentType = 'image/png'

const HOLES = [
  { top: 3, left: 11.5 },
  { top: 7, left: 19 },
  { top: 7, left: 4 },
  { top: 14.5, left: 11.5 },
  { top: 21.5, left: 5.5 },
  { top: 21.5, left: 18 },
]

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#ffffff',
        }}
      >
        <div
          style={{
            position: 'relative',
            width: 26,
            height: 26,
            borderRadius: '50%',
            background: '#000000',
            display: 'flex',
          }}
        >
          {HOLES.map((h, i) => (
            <div
              key={i}
              style={{
                position: 'absolute',
                top: h.top,
                left: h.left,
                width: 3,
                height: 3,
                borderRadius: '50%',
                background: '#ffffff',
                display: 'flex',
              }}
            />
          ))}
        </div>
      </div>
    ),
    { ...size }
  )
}
