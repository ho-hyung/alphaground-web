'use client'

import { useState } from 'react'

export default function WaitlistPage() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('loading')
    setErrorMsg('')

    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()

      if (!res.ok) {
        setErrorMsg(data.error || '오류가 발생했습니다.')
        setStatus('error')
        return
      }

      setStatus('success')
    } catch {
      setErrorMsg('네트워크 오류가 발생했습니다. 다시 시도해주세요.')
      setStatus('error')
    }
  }

  return (
    <div className="min-h-[calc(100vh-8rem)] flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg space-y-8 text-center">

        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-medium">
          <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-pulse" />
          사전 예약 진행 중
        </div>

        {/* Headline */}
        <div className="space-y-3">
          <h1 className="text-3xl sm:text-4xl font-bold text-white leading-tight tracking-tight">
            부동산 경매의 숨겨진 기회를
            <br />
            <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
              AI가 찾아드립니다
            </span>
          </h1>
          <p className="text-slate-400 text-base sm:text-lg">
            AlphaGround 정식 출시 전 사전 예약 시{' '}
            <span className="text-indigo-400 font-semibold">50% 할인 혜택</span>을 드립니다
          </p>
        </div>

        {/* Value props */}
        <div className="grid grid-cols-3 gap-3 text-center">
          {[
            { icon: '🔍', label: 'AI 권리분석', desc: '복잡한 등기부 자동 해석' },
            { icon: '📈', label: '수익성 예측', desc: '낙찰가·임대수익 시뮬레이션' },
            { icon: '⚡', label: '실시간 알림', desc: '조건 맞는 매물 즉시 알림' },
          ].map(({ icon, label, desc }) => (
            <div
              key={label}
              className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-3"
            >
              <div className="text-2xl mb-1">{icon}</div>
              <p className="text-white text-xs font-semibold">{label}</p>
              <p className="text-slate-500 text-xs mt-0.5">{desc}</p>
            </div>
          ))}
        </div>

        {/* Form or Success */}
        {status === 'success' ? (
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-8 space-y-3">
            <div className="text-4xl">🎉</div>
            <h2 className="text-xl font-bold text-emerald-400">사전 예약 완료!</h2>
            <p className="text-slate-400 text-sm">
              정식 출시 시 50% 할인 코드를 이메일로 보내드립니다.
              <br />
              빠른 출시를 위해 최선을 다하겠습니다.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="이메일 주소를 입력하세요"
                required
                disabled={status === 'loading'}
                className="flex-1 px-4 py-3 rounded-xl bg-slate-800/60 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:opacity-50 transition-colors"
              />
              <button
                type="submit"
                disabled={status === 'loading'}
                className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-semibold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
              >
                {status === 'loading' ? '등록 중...' : '사전 예약하기'}
              </button>
            </div>
            {status === 'error' && (
              <p className="text-red-400 text-sm text-left">{errorMsg}</p>
            )}
            <p className="text-slate-600 text-xs">
              스팸 없음 · 언제든지 구독 해지 가능
            </p>
          </form>
        )}

        {/* Social proof hint */}
        <p className="text-slate-600 text-xs">
          이미 <span className="text-slate-400 font-medium">부동산 투자자들</span>이 사전 예약했습니다
        </p>
      </div>
    </div>
  )
}
