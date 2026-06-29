'use client'

import {
  ResponsiveContainer, LineChart, Line,
  XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts'
import { fmtCompact, fmtLKR } from '@/lib/analytics'

interface TrendPoint { month: string; sales: number; gp: number; count: number }
interface TooltipPayload { name: string; value: number; color: string }

function ChartTooltip({ active, payload, label }: {
  active?: boolean
  payload?: TooltipPayload[]
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white rounded-xl shadow-lg border border-[#E8E6E1] p-3 text-xs">
      <p className="font-semibold text-[#6B6B6B] mb-1.5">{label}</p>
      {payload.map(p => (
        <p key={p.name} style={{ color: p.color }} className="font-medium">
          {p.name}: {p.value > 999 ? fmtLKR(p.value) : p.value}
        </p>
      ))}
    </div>
  )
}

export default function TrendChart({
  data,
  dataKey,
  name,
  stroke,
}: {
  data: TrendPoint[]
  dataKey: 'sales' | 'gp'
  name: string
  stroke: string
}) {
  return (
    <ResponsiveContainer width="100%" height={180}>
      <LineChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#F3F2EF" vertical={false} />
        <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
        <YAxis tickFormatter={v => fmtCompact(v)} tick={{ fontSize: 10, fill: '#9CA3AF' }} width={44} axisLine={false} tickLine={false} />
        <Tooltip content={<ChartTooltip />} />
        <Line
          type="monotone"
          dataKey={dataKey}
          name={name}
          stroke={stroke}
          strokeWidth={2}
          dot={{ fill: stroke, r: 3, strokeWidth: 0 }}
          activeDot={{ r: 5, strokeWidth: 0 }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
