'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'

interface Props {
  caseNumber: string
  auctionDate: string
}

type Status = 'idle' | 'submitting' | 'success' | 'error'

export function AlertButton({ caseNumber, auctionDate }: Props) {
  const [showModal, setShowModal] = useState(false)
  const [telegramId, setTelegramId] = useState('')
  const [status, setStatus] = useState<Status>('idle')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!telegramId.trim()) return
    setStatus('submitting')
    await new Promise((r) => setTimeout(r, 800))
    setStatus('success')
  }

  function handleClose() {
    setShowModal(false)
    setStatus('idle')
    setTelegramId('')
  }

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="flex items-center gap-2 w-full px-4 py-3 rounded-lg bg-indigo-500/10 border border-indigo-500/30 hover:bg-indigo-500/20 hover:border-indigo-500/50 transition-all text-left"
      >
        <span className="text-lg">🔔</span>
        <div>
          <p className="text-sm font-semibold text-indigo-300">이 매물 입찰가 알림 받기</p>
          <p className="text-xs text-slate-400">경매 당일 아침 텔레그램으로 알림을 보내드립니다</p>
        </div>
      </button>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 w-full max-w-sm">
            {status === 'success' ? (
              <div className="text-center py-4">
                <div className="text-4xl mb-3">✅</div>
                <h3 className="text-base font-bold text-white mb-1">알림 신청 완료</h3>
                <p className="text-sm text-slate-400 mb-1">
                  <span className="font-mono text-indigo-300">@{telegramId}</span>으로
                </p>
                <p className="text-sm text-slate-400 mb-4">
                  <span className="font-semibold text-white">{auctionDate}</span> 당일 아침 9시에 알림을 보내드립니다.
                </p>
                <Button onClick={handleClose} variant="outline" className="border-slate-600">
                  닫기
                </Button>
              </div>
            ) : (
              <>
                <h2 className="text-base font-bold text-white mb-1">입찰가 알림 신청</h2>
                <p className="text-sm text-slate-400 mb-1">
                  사건번호: <span className="font-mono text-slate-200">{caseNumber}</span>
                </p>
                <p className="text-sm text-slate-400 mb-4">
                  경매일: <span className="text-white font-medium">{auctionDate}</span>
                </p>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      텔레그램 아이디 (@ 없이 입력)
                    </label>
                    <div className="flex items-center gap-2 bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-2">
                      <span className="text-slate-400 text-sm">@</span>
                      <input
                        type="text"
                        value={telegramId}
                        onChange={(e) => setTelegramId(e.target.value.replace(/^@/, ''))}
                        placeholder="your_telegram_id"
                        className="flex-1 bg-transparent text-sm text-white placeholder-slate-500 outline-none"
                        autoFocus
                      />
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      @AlphaGroundBot을 먼저 시작해주세요
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      type="submit"
                      disabled={!telegramId.trim() || status === 'submitting'}
                      className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white"
                    >
                      {status === 'submitting' ? '신청 중...' : '알림 신청'}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleClose}
                      className="border-slate-600"
                    >
                      취소
                    </Button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
