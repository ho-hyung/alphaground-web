export type UserTier = 'guest' | 'free' | 'premium'

export interface WeeklyUsage {
  weekKey: string
  viewedCaseNumbers: string[]
}

export const FREE_WEEKLY_LIMIT = 3

const WEEKLY_USAGE_KEY = 'alphaground_weekly_usage_v1'
const PREMIUM_KEY = 'alphaground_premium_v1'

/** Returns ISO week key: "YYYY-WW" */
export function getWeekKey(date: Date = new Date()): string {
  const d = new Date(date)
  d.setUTCHours(0, 0, 0, 0)
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7))
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const weekNum = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
  return `${d.getUTCFullYear()}-W${String(weekNum).padStart(2, '0')}`
}

export function loadWeeklyUsage(): WeeklyUsage {
  try {
    const raw = localStorage.getItem(WEEKLY_USAGE_KEY)
    if (!raw) return { weekKey: getWeekKey(), viewedCaseNumbers: [] }

    const parsed: WeeklyUsage = JSON.parse(raw)
    const currentWeekKey = getWeekKey()

    if (parsed.weekKey !== currentWeekKey) {
      return { weekKey: currentWeekKey, viewedCaseNumbers: [] }
    }

    return parsed
  } catch {
    return { weekKey: getWeekKey(), viewedCaseNumbers: [] }
  }
}

export function saveWeeklyUsage(usage: WeeklyUsage): void {
  localStorage.setItem(WEEKLY_USAGE_KEY, JSON.stringify(usage))
}

export function hasViewedThisWeek(caseNumber: string, usage: WeeklyUsage): boolean {
  return usage.viewedCaseNumbers.includes(caseNumber)
}

export function recordReportView(caseNumber: string): WeeklyUsage {
  const usage = loadWeeklyUsage()
  if (hasViewedThisWeek(caseNumber, usage)) return usage
  const updated: WeeklyUsage = {
    ...usage,
    viewedCaseNumbers: [...usage.viewedCaseNumbers, caseNumber],
  }
  saveWeeklyUsage(updated)
  return updated
}

export function getRemainingViews(usage: WeeklyUsage): number {
  const used = usage.viewedCaseNumbers.length
  return Math.max(0, FREE_WEEKLY_LIMIT - used)
}

export function isPremiumActive(): boolean {
  try {
    const raw = localStorage.getItem(PREMIUM_KEY)
    if (!raw) return false
    const { expiry } = JSON.parse(raw)
    if (Date.now() >= expiry) {
      localStorage.removeItem(PREMIUM_KEY)
      return false
    }
    return true
  } catch {
    return false
  }
}

export function activatePremium(durationMs: number = 7 * 24 * 60 * 60 * 1000): void {
  localStorage.setItem(PREMIUM_KEY, JSON.stringify({ expiry: Date.now() + durationMs }))
}

/**
 * Returns canView = true when:
 *  - tier is 'premium'
 *  - tier is 'free' AND (weekly limit not exceeded OR caseNumber already viewed this week)
 */
export function canViewReport(
  tier: UserTier,
  caseNumber: string,
  usage: WeeklyUsage
): boolean {
  if (tier === 'guest') return false
  if (tier === 'premium') return true
  return (
    hasViewedThisWeek(caseNumber, usage) ||
    usage.viewedCaseNumbers.length < FREE_WEEKLY_LIMIT
  )
}
