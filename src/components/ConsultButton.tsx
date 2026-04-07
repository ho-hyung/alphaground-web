'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'

interface Props {
  caseNumber: string
  district: string
}

const CONSULTANTS = [
  {
    id: 1,
    name: '김민준 경매사',
    badge: '경매 전문 10년',
    rating: 4.9,
    reviews: 124,
    fee: '₩150,000 / 1시간',
    specialty: '아파트 · 수도권',
    avatar: '👨‍💼',
  },
  {
    id: 2,
    name: '이서연 변호사',
    badge: '법률 권리분석',
    rating: 4.8,
    reviews: 87,
    fee: '₩200,000 / 1시간',
    specialty: '상가 · 권리분쟁',
    avatar: '👩‍⚖️',
  },
] as const

export function ConsultButton({ caseNumber, district }: Props) {
  const [showModal, setShowModal] = useState(false)
  const [selected, setSelected] = useState<number | null>(null)
  const [requested, setRequested] = useState(false)

  async function handleRequest(id: number) {
    setSelected(id)
    await new Promise((r) => setTimeout(r, 600))
    setRequested(true)
  }

  function handleClose() {
    setShowModal(false)
    setSelected(null)
    setRequested(false)
  }

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="flex items-center gap-2 w-full px-4 py-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/20 hover:border-emerald-500/50 transition-all text-left"
      >
        <span className="text-lg">🧑‍💼</span>
        <div>
          <p className="text-sm font-semibold text-emerald-300">현직 경매사에게 상담하기</p>
          <p className="text-xs text-slate-400">AI 분석 너머의 실전 전략 · 유료 전문가 연결</p>
        </div>
      </button>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 w-full max-w-sm">
            {requested ? (
              <div className="text-center py-4">
                <div className="text-4xl mb-3">📩</div>
                <h3 className="text-base font-bold text-white mb-1">상담 요청 완료</h3>
                <p className="text-sm text-slate-400 mb-4">
                  전문가가 24시간 내 연락드립니다.<br />
                  사건번호 <span className="font-mono text-emerald-300">{caseNumber}</span>를 포함해 안내해 드립니다.
                </p>
                <Button onClick={handleClose} variant="outline" className="border-slate-600">
                  닫기
                </Button>
              </div>
            ) : (
              <>
                <h2 className="text-base font-bold text-white mb-1">전문가 상담 연결</h2>
                <p className="text-sm text-slate-400 mb-4">
                  {district} 매물 · <span className="font-mono text-slate-300">{caseNumber}</span>
                </p>

                <div className="space-y-3 mb-4">
                  {CONSULTANTS.map((c) => (
                    <div
                      key={c.id}
                      className="flex items-start gap-3 p-3 rounded-lg bg-slate-700/40 border border-slate-600/50"
                    >
                      <span className="text-2xl">{c.avatar}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-sm font-semibold text-white">{c.name}</span>
                          <span className="text-xs bg-emerald-500/20 text-emerald-400 px-1.5 py-0 rounded-full">
                            {c.badge}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mb-1">{c.specialty}</p>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-amber-400">
                            ★ {c.rating} ({c.reviews}건)
                          </span>
                          <span className="text-xs text-slate-300 font-medium">{c.fee}</span>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        disabled={selected === c.id}
                        onClick={() => handleRequest(c.id)}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs shrink-0"
                      >
                        {selected === c.id ? '요청 중...' : '연결'}
                      </Button>
                    </div>
                  ))}
                </div>

                <p className="text-xs text-slate-500 mb-3 text-center">
                  AlphaGround는 연결 수수료로 상담료의 15%를 수취합니다
                </p>
                <button
                  onClick={handleClose}
                  className="w-full text-xs text-slate-500 hover:text-slate-300"
                >
                  닫기
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
