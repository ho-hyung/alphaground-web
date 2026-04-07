'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  type UserTier,
  type WeeklyUsage,
  FREE_WEEKLY_LIMIT,
  loadWeeklyUsage,
  isPremiumActive,
  canViewReport,
  recordReportView,
  getRemainingViews,
} from '@/lib/access-control'

interface AccessControlState {
  tier: UserTier
  isLoading: boolean
  weeklyUsage: WeeklyUsage
  remainingViews: number
  canView: (caseNumber: string) => boolean
  markViewed: (caseNumber: string) => void
}

const INITIAL_USAGE: WeeklyUsage = { weekKey: '', viewedCaseNumbers: [] }

export function useAccessControl(): AccessControlState {
  const [tier, setTier] = useState<UserTier>('guest')
  const [isLoading, setIsLoading] = useState(true)
  const [weeklyUsage, setWeeklyUsage] = useState<WeeklyUsage>(INITIAL_USAGE)

  useEffect(() => {
    const usage = loadWeeklyUsage()
    setWeeklyUsage(usage)

    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        setTier('guest')
      } else if (isPremiumActive()) {
        setTier('premium')
      } else {
        setTier('free')
      }
      setIsLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) {
        setTier('guest')
      } else if (isPremiumActive()) {
        setTier('premium')
      } else {
        setTier('free')
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  function canView(caseNumber: string): boolean {
    return canViewReport(tier, caseNumber, weeklyUsage)
  }

  function markViewed(caseNumber: string): void {
    const updated = recordReportView(caseNumber)
    setWeeklyUsage(updated)
  }

  return {
    tier,
    isLoading,
    weeklyUsage,
    remainingViews: getRemainingViews(weeklyUsage),
    canView,
    markViewed,
  }
}

export { FREE_WEEKLY_LIMIT }
