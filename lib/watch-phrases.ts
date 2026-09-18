/**
 * Rotating copy shown during a long wait — shared by SkeletonMessage (page
 * skeletons) and LongTaskProgress (determinate bars).
 *
 * Kept in lib/ rather than exported from either component so neither has to
 * import the other: the loading primitives form a strict tree
 * (component → lib), never a cycle.
 */
export const WATCH_PHRASES = [
  'Winding the watch…',
  'Setting the time…',
  'Polishing the crystal…',
  'Checking the movement…',
  'Almost there…',
] as const

/** How long each phrase holds before the next one. */
export const PHRASE_MS = 1800
