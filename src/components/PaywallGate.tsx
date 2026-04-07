'use client'

import { useEffect } from 'react'
import { useAccessControl } from '@/hooks/useAccessControl'
import { WeeklyLimitGate } from '@/components/WeeklyLimitGate'

interface Props {
  children: React.ReactNode
  caseNumber: string
  score?: number
}

export function PaywallGate({ children, caseNumber, score: _score }: Props) {
  const { tier, isLoading, canView, markViewed } = useAccessControl()

  useEffect(() => {
    if (!isLoading && tier !== 'guest' && canView(caseNumber)) {
      markViewed(caseNumber)
    }
  }, [isLoading, tier, caseNumber]) // eslint-disable-line react-hooks/exhaustive-deps

  if (isLoading) {
    return (
      <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-8 text-center">
        <p className="text-slate-500 text-sm">로딩 중...</p>
      </div>
    )
  }

  return (
    <WeeklyLimitGate canView={canView(caseNumber)}>
      {children}
    </WeeklyLimitGate>
  )
}
