export const AVATAR_COLOR_OPTIONS = [
  { classes: 'bg-red-100 text-red-600',         hex: '#FEE2E2' },
  { classes: 'bg-orange-100 text-orange-600',   hex: '#FFEDD5' },
  { classes: 'bg-amber-100 text-amber-600',     hex: '#FEF3C7' },
  { classes: 'bg-emerald-100 text-emerald-600', hex: '#D1FAE5' },
  { classes: 'bg-sky-100 text-sky-600',         hex: '#E0F2FE' },
  { classes: 'bg-violet-100 text-violet-600',   hex: '#EDE9FE' },
  { classes: 'bg-pink-100 text-pink-600',       hex: '#FCE7F3' },
  { classes: 'bg-teal-100 text-teal-600',       hex: '#CCFBF1' },
] as const

const AUTO_COLORS = AVATAR_COLOR_OPTIONS.map(o => o.classes)

export function avatarColor(name: string, stored?: string | null): string {
  if (stored) return stored
  const n = name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
  return AUTO_COLORS[n % AUTO_COLORS.length]
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase() ?? '')
    .join('')
}
