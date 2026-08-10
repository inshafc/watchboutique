// Shared tokens for the "cream card" design system (Inventory, Watch Detail,
// Invoicing, League Home). Single source of truth — do not redefine these
// locally in page/component files; import from here instead.

// ── Color palette ───────────────────────────────────────────────────────────
export const INK      = '#14140f'
export const INK_08   = 'rgba(20,20,15,.08)'
export const INK_45   = 'rgba(20,20,15,.45)'
export const INK_60   = 'rgba(20,20,15,.6)'
export const CARD_BG  = '#f7f6f3'

export const GREEN    = '#1f6f43'
export const RED      = '#b23a2c'
export const GOLD     = '#8a6f2e'
export const AMBER    = '#8a5c15'
export const AMBER_BG = 'rgba(181,118,26,.14)'
export const BLUE     = '#3f5f8a'
export const LIME     = '#d8f24a'

// ── Radii ────────────────────────────────────────────────────────────────────
// The pixel values that recur identically, as raw `style={{ borderRadius }}`
// numbers, across redesigned pages. Values used only in one place (e.g. the
// 10/11/12/20px radii still local to WatchInventory.tsx) are left as-is —
// promote them here if a second page starts reusing the same number.
export const RADII = {
  sm:   14,
  md:   18,
  lg:   24,
  pill: 999,
} as const

// ── Sizing ───────────────────────────────────────────────────────────────────
export const CONTROL_HEIGHT_LG = 54 // primary CTA / large control height

// ── Spacing ──────────────────────────────────────────────────────────────────
export const CARD_PADDING = 26 // outer padding for a full-width "Card" section
