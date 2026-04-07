'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'

const STORAGE_KEY = 'alphaground_membership'
const PLANS = [
  { id: 'monthly', label: '월간 멤버십', price: '₩29,900/월', desc: '모든 매물 상세 분석 열람' },
  { id: 'annual', label: '연간 멤버십', price: '₩249,000/년', desc: '17% 할인 + 프리미엄 알림' },
] as const

interface Props {
  children: React.ReactNode
  score?: number
}

export function PaywallGate({ children, score }: Props) {
  const [isMember, setIsMember] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'annual'>('monthly')

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const { expiry } = JSON.parse(stored)
      if (Date.now() < expiry) setIsMember(true)
      else localStorage.removeItem(STORAGE_KEY)
    }
  }, [])

  function activateMembership() {
    const expiry = Date.now() + 24 * 60 * 60 * 1000
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ plan: selectedPlan, expiry }))
    setIsMember(true)
    setShowModal(false)
  }

  if (isMember) return <>{children}</>

  return (
    <>
      <div className="relative">
        <div className="pointer-events-none select-none opacity-30 blur-sm">
          {children}
        </div>
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/70 rounded-xl border border-amber-500/30 backdrop-blur-sm p-6 text-center">
          {score !== undefined && score >= 90 && (
            <span className="inline-flex items-center gap-1 bg-gradient-to-r from-amber-500 to-yellow-400 text-black text-xs font-bold px-3 py-1 rounded-full mb-3">
              ★ PREMIUM 매물
            </span>
          )}
          <div className="text-2xl mb-2">🔒</div>
          <h3 className="text-base font-bold text-white mb-1">프리미엄 회원 전용</h3>
          <p className="text-sm text-slate-400 mb-4 max-w-xs">
            AI 법률분석, 입지분석, 수익성 분석 전체 리포트는 유료 멤버십 회원에게만 제공됩니다.
          </p>
          <Button
            onClick={() => setShowModal(true)}
            className="bg-gradient-to-r from-amber-500 to-yellow-400 text-black font-bold hover:opacity-90"
          >
            멤버십 가입하기
          </Button>
          <button
            onClick={activateMembership}
            className="mt-2 text-xs text-slate-500 hover:text-slate-300 underline underline-offset-2"
          >
            7일 무료 체험 시작
          </button>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 w-full max-w-sm">
            <h2 className="text-lg font-bold text-white mb-1">AlphaGround 멤버십</h2>
            <p className="text-sm text-slate-400 mb-4">
              초과 수익을 위한 프리미엄 경매 인사이트
            </p>

            <div className="space-y-2 mb-6">
              {PLANS.map((plan) => (
                <button
                  key={plan.id}
                  onClick={() => setSelectedPlan(plan.id)}
                  className={`w-full text-left p-3 rounded-lg border transition-all ${
                    selectedPlan === plan.id
                      ? 'border-amber-500 bg-amber-500/10'
                      : 'border-slate-600 bg-slate-700/30 hover:border-slate-500'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-white">{plan.label}</span>
                    <span className="text-sm font-bold text-amber-400">{plan.price}</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">{plan.desc}</p>
                </button>
              ))}
            </div>

            <Button
              onClick={activateMembership}
              className="w-full bg-gradient-to-r from-amber-500 to-yellow-400 text-black font-bold hover:opacity-90"
            >
              결제하고 시작하기
            </Button>
            <p className="text-xs text-slate-500 text-center mt-2">* 데모: 실제 결제 없이 24시간 체험됩니다</p>
            <button
              onClick={() => setShowModal(false)}
              className="w-full mt-3 text-xs text-slate-500 hover:text-slate-300"
            >
              닫기
            </button>
          </div>
        </div>
      )}
    </>
  )
}
