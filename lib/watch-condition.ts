export type ConditionDisplay = 'Unworn' | 'Pre-Owned'

// The DB column stays free text; legacy rows carry values like 'Excellent',
// 'Good', 'Brand New' from before the dropdown was locked to two options.
// Anything that isn't (case-insensitively) 'unworn' displays as Pre-Owned.
export function displayCondition(condition?: string | null): ConditionDisplay {
  return (condition ?? '').trim().toLowerCase() === 'unworn' ? 'Unworn' : 'Pre-Owned'
}
