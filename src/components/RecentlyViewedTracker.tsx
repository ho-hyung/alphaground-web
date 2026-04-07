'use client'

import { useEffect } from 'react'

interface Props {
  caseNumber: string
}

// 매물 상세 페이지 방문 시 recently_viewed에 자동 기록
export function RecentlyViewedTracker({ caseNumber }: Props) {
  useEffect(() => {
    fetch('/api/recently-viewed', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ caseNumber }),
    }).catch(() => {})
  }, [caseNumber])

  return null
}
