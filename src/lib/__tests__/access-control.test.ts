import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  getWeekKey,
  loadWeeklyUsage,
  saveWeeklyUsage,
  hasViewedThisWeek,
  recordReportView,
  getRemainingViews,
  canViewReport,
  isPremiumActive,
  activatePremium,
  FREE_WEEKLY_LIMIT,
  type WeeklyUsage,
} from '../access-control'

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value },
    removeItem: (key: string) => { delete store[key] },
    clear: () => { store = {} },
  }
})()

Object.defineProperty(global, 'localStorage', { value: localStorageMock })

const WEEKLY_USAGE_KEY = 'alphaground_weekly_usage_v1'
const PREMIUM_KEY = 'alphaground_premium_v1'

beforeEach(() => localStorageMock.clear())

// ─── getWeekKey ──────────────────────────────────────────────────────────────

describe('getWeekKey', () => {
  it('returns a YYYY-WW formatted string', () => {
    const key = getWeekKey(new Date('2026-04-07'))
    expect(key).toMatch(/^\d{4}-W\d{2}$/)
  })

  it('returns same week key for days within the same ISO week', () => {
    const monday = getWeekKey(new Date('2026-04-06'))  // Monday
    const sunday = getWeekKey(new Date('2026-04-12')) // Sunday
    expect(monday).toBe(sunday)
  })

  it('returns different week key for days in different weeks', () => {
    const week1 = getWeekKey(new Date('2026-04-05')) // Sunday of prev week
    const week2 = getWeekKey(new Date('2026-04-06')) // Monday of new week
    expect(week1).not.toBe(week2)
  })

  it('uses current date when no argument provided', () => {
    const key = getWeekKey()
    expect(key).toMatch(/^\d{4}-W\d{2}$/)
  })
})

// ─── loadWeeklyUsage ─────────────────────────────────────────────────────────

describe('loadWeeklyUsage', () => {
  it('returns empty usage when localStorage is empty', () => {
    const usage = loadWeeklyUsage()
    expect(usage.viewedCaseNumbers).toEqual([])
    expect(usage.weekKey).toBe(getWeekKey())
  })

  it('returns stored usage when week key matches', () => {
    const stored: WeeklyUsage = { weekKey: getWeekKey(), viewedCaseNumbers: ['A', 'B'] }
    localStorageMock.setItem(WEEKLY_USAGE_KEY, JSON.stringify(stored))
    const usage = loadWeeklyUsage()
    expect(usage.viewedCaseNumbers).toEqual(['A', 'B'])
  })

  it('resets when stored week key is stale', () => {
    const stale: WeeklyUsage = { weekKey: '2020-W01', viewedCaseNumbers: ['A', 'B'] }
    localStorageMock.setItem(WEEKLY_USAGE_KEY, JSON.stringify(stale))
    const usage = loadWeeklyUsage()
    expect(usage.viewedCaseNumbers).toEqual([])
    expect(usage.weekKey).toBe(getWeekKey())
  })

  it('returns empty usage when localStorage contains invalid JSON', () => {
    localStorageMock.setItem(WEEKLY_USAGE_KEY, 'not-json')
    const usage = loadWeeklyUsage()
    expect(usage.viewedCaseNumbers).toEqual([])
  })
})

// ─── saveWeeklyUsage ─────────────────────────────────────────────────────────

describe('saveWeeklyUsage', () => {
  it('persists usage to localStorage', () => {
    const usage: WeeklyUsage = { weekKey: getWeekKey(), viewedCaseNumbers: ['X'] }
    saveWeeklyUsage(usage)
    const raw = localStorageMock.getItem(WEEKLY_USAGE_KEY)
    expect(JSON.parse(raw!)).toEqual(usage)
  })
})

// ─── hasViewedThisWeek ───────────────────────────────────────────────────────

describe('hasViewedThisWeek', () => {
  it('returns true when caseNumber is in viewedCaseNumbers', () => {
    const usage: WeeklyUsage = { weekKey: getWeekKey(), viewedCaseNumbers: ['A', 'B'] }
    expect(hasViewedThisWeek('A', usage)).toBe(true)
  })

  it('returns false when caseNumber is not in viewedCaseNumbers', () => {
    const usage: WeeklyUsage = { weekKey: getWeekKey(), viewedCaseNumbers: ['A'] }
    expect(hasViewedThisWeek('Z', usage)).toBe(false)
  })

  it('returns false for empty usage', () => {
    const usage: WeeklyUsage = { weekKey: getWeekKey(), viewedCaseNumbers: [] }
    expect(hasViewedThisWeek('A', usage)).toBe(false)
  })
})

// ─── recordReportView ────────────────────────────────────────────────────────

describe('recordReportView', () => {
  it('adds a new caseNumber to usage', () => {
    const updated = recordReportView('CASE-001')
    expect(updated.viewedCaseNumbers).toContain('CASE-001')
  })

  it('does not duplicate already-viewed caseNumber', () => {
    recordReportView('CASE-001')
    const updated = recordReportView('CASE-001')
    expect(updated.viewedCaseNumbers.filter((c) => c === 'CASE-001')).toHaveLength(1)
  })

  it('accumulates multiple different caseNumbers', () => {
    recordReportView('A')
    recordReportView('B')
    const updated = recordReportView('C')
    expect(updated.viewedCaseNumbers).toEqual(['A', 'B', 'C'])
  })

  it('persists to localStorage', () => {
    recordReportView('CASE-X')
    const loaded = loadWeeklyUsage()
    expect(loaded.viewedCaseNumbers).toContain('CASE-X')
  })
})

// ─── getRemainingViews ───────────────────────────────────────────────────────

describe('getRemainingViews', () => {
  it('returns FREE_WEEKLY_LIMIT when no views used', () => {
    const usage: WeeklyUsage = { weekKey: getWeekKey(), viewedCaseNumbers: [] }
    expect(getRemainingViews(usage)).toBe(FREE_WEEKLY_LIMIT)
  })

  it('returns correct remaining count', () => {
    const usage: WeeklyUsage = { weekKey: getWeekKey(), viewedCaseNumbers: ['A', 'B'] }
    expect(getRemainingViews(usage)).toBe(FREE_WEEKLY_LIMIT - 2)
  })

  it('returns 0 when limit is reached', () => {
    const viewedCaseNumbers = Array.from({ length: FREE_WEEKLY_LIMIT }, (_, i) => `CASE-${i}`)
    const usage: WeeklyUsage = { weekKey: getWeekKey(), viewedCaseNumbers }
    expect(getRemainingViews(usage)).toBe(0)
  })

  it('never returns negative', () => {
    const viewedCaseNumbers = ['A', 'B', 'C', 'D', 'E']
    const usage: WeeklyUsage = { weekKey: getWeekKey(), viewedCaseNumbers }
    expect(getRemainingViews(usage)).toBe(0)
  })
})

// ─── canViewReport ───────────────────────────────────────────────────────────

describe('canViewReport', () => {
  const emptyUsage: WeeklyUsage = { weekKey: getWeekKey(), viewedCaseNumbers: [] }
  const fullUsage: WeeklyUsage = {
    weekKey: getWeekKey(),
    viewedCaseNumbers: Array.from({ length: FREE_WEEKLY_LIMIT }, (_, i) => `CASE-${i}`),
  }

  it('returns false for guest tier', () => {
    expect(canViewReport('guest', 'CASE-1', emptyUsage)).toBe(false)
  })

  it('returns false for guest even with empty limit', () => {
    expect(canViewReport('guest', 'CASE-1', fullUsage)).toBe(false)
  })

  it('returns true for premium tier regardless of usage', () => {
    expect(canViewReport('premium', 'CASE-1', fullUsage)).toBe(true)
    expect(canViewReport('premium', 'NEW', emptyUsage)).toBe(true)
  })

  it('returns true for free tier within weekly limit', () => {
    expect(canViewReport('free', 'NEW-CASE', emptyUsage)).toBe(true)
  })

  it('returns false for free tier when limit reached and case is new', () => {
    expect(canViewReport('free', 'NEW-CASE', fullUsage)).toBe(false)
  })

  it('returns true for free tier when limit reached but case was already viewed', () => {
    const usageWithViewed: WeeklyUsage = {
      weekKey: getWeekKey(),
      viewedCaseNumbers: ['CASE-0', 'CASE-1', 'CASE-2'],
    }
    expect(canViewReport('free', 'CASE-0', usageWithViewed)).toBe(true)
  })
})

// ─── isPremiumActive / activatePremium ───────────────────────────────────────

describe('isPremiumActive', () => {
  afterEach(() => localStorageMock.removeItem(PREMIUM_KEY))

  it('returns false when no premium stored', () => {
    expect(isPremiumActive()).toBe(false)
  })

  it('returns true when premium is active', () => {
    activatePremium(60 * 60 * 1000) // 1 hour
    expect(isPremiumActive()).toBe(true)
  })

  it('returns false and removes entry when premium has expired', () => {
    localStorageMock.setItem(PREMIUM_KEY, JSON.stringify({ expiry: Date.now() - 1000 }))
    expect(isPremiumActive()).toBe(false)
    expect(localStorageMock.getItem(PREMIUM_KEY)).toBeNull()
  })

  it('returns false when localStorage contains invalid JSON', () => {
    localStorageMock.setItem(PREMIUM_KEY, 'bad-json')
    expect(isPremiumActive()).toBe(false)
  })
})

describe('activatePremium', () => {
  it('sets premium with default 7-day duration', () => {
    activatePremium()
    expect(isPremiumActive()).toBe(true)
    const stored = JSON.parse(localStorageMock.getItem(PREMIUM_KEY)!)
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000
    expect(stored.expiry).toBeGreaterThanOrEqual(Date.now() + sevenDaysMs - 1000)
  })

  it('sets premium with custom duration', () => {
    const oneHour = 60 * 60 * 1000
    activatePremium(oneHour)
    expect(isPremiumActive()).toBe(true)
  })
})
