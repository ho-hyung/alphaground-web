'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { FREE_WEEKLY_LIMIT } from '@/lib/access-control'
import { activatePremium } from '@/lib/access-control'

interface Props {
  children: React.ReactNode
  canView: boolean
  onUpgrade?: () => void
}

export function WeeklyLimitGate({ children, canView, onUpgrade }: Props) {
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)

  if (canView) return <>{children}</>

  function handleDemoUpgrade() {
    activatePremium()
    window.location.reload()
  }

  return (
    <>
      <div className="relative">
        <div className="pointer-events-none select-none opacity-20 blur-sm">
          {children}
        </div>
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/80 rounded-xl border border-amber-500/30 backdrop-blur-sm p-6 text-center">
          <div className="text-3xl mb-3">📊</div>
          <h3 className="text-base font-bold text-white mb-2">
            주간 무료 열람 한도 초과
          </h3>
          <p className="text-sm text-slate-400 mb-1 max-w-xs">
            무료 회원은 주당 <span className="text-white font-semibold">{FREE_WEEKLY_LIMIT}건</span>의
            상세 리포트를 열람할 수 있습니다.
          </p>
          <p className="text-xs text-slate-500 mb-5">
            매주 월요일에 초기화됩니다.
          </p>
          <Button
            onClick={() => {
              onUpgrade?.()
              setShowUpgradeModal(true)
            }}
            className="bg-gradient-to-r from-amber-500 to-yellow-400 text-black font-bold hover:opacity-90"
          >
            프리미엄으로 업그레이드
          </Button>
        </div>
      </div>

      {showUpgradeModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => setShowUpgradeModal(false)}
        >
          <div
            className="bg-slate-800 border border-slate-700 rounded-2xl p-6 w-full max-w-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center mb-5">
              <div className="text-3xl mb-2">⭐</div>
              <h2 className="text-lg font-bold text-white mb-2">프리미엄 멤버십</h2>
              <p className="text-sm text-slate-400">
                모든 매물 무제한 열람 + 텔레그램 실시간 알림
              </p>
            </div>

            <div className="bg-slate-700/40 rounded-lg p-4 mb-5 space-y-2">
              <div className="flex items-center gap-2 text-sm text-slate-300">
                <span className="text-emerald-400">✓</span> 모든 매물 상세 리포트 무제한
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-300">
                <span className="text-emerald-400">✓</span> 텔레그램 실시간 알림
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-300">
                <span className="text-emerald-400">✓</span> AI 법률·입지·수익성 분석 전체 공개
              </div>
            </div>

            <Button
              onClick={handleDemoUpgrade}
              className="w-full bg-gradient-to-r from-amber-500 to-yellow-400 text-black font-bold hover:opacity-90 mb-2"
            >
              7일 무료 체험 시작
            </Button>
            <p className="text-xs text-slate-500 text-center mb-3">* 데모: 실제 결제 없이 7일 체험됩니다</p>
            <button
              onClick={() => setShowUpgradeModal(false)}
              className="w-full text-sm text-slate-500 hover:text-slate-300 py-1 transition-colors"
            >
              닫기
            </button>
          </div>
        </div>
      )}
    </>
  )
}
