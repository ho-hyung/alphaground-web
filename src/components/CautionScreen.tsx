'use client'

import { useState } from 'react'
import type { Contradiction, CautionCheckItem } from '@/types/property'

interface Props {
  summary: string
  contradictions?: Contradiction[]
  checklist?: CautionCheckItem[]
}

const priorityConfig = {
  critical: { label: '즉시 확인 필수', color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/30', dot: 'bg-red-500' },
  high: { label: '확인 필요', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/30', dot: 'bg-amber-500' },
  medium: { label: '권장', color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/30', dot: 'bg-blue-500' },
}

function ContradictionCard({ c }: { c: Contradiction }) {
  return (
    <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-4 space-y-2">
      <div className="flex items-center gap-2 text-xs">
        <span className="bg-red-500/20 text-red-300 border border-red-500/30 px-2 py-0.5 rounded font-mono">
          {c.docA}
        </span>
        <span className="text-slate-500">vs</span>
        <span className="bg-orange-500/20 text-orange-300 border border-orange-500/30 px-2 py-0.5 rounded font-mono">
          {c.docB}
        </span>
      </div>
      <p className="text-sm font-semibold text-red-300">{c.issue}</p>
      <p className="text-xs text-slate-400 leading-relaxed">{c.detail}</p>
    </div>
  )
}

function ChecklistSection({ section }: { section: CautionCheckItem }) {
  const [checked, setChecked] = useState<Set<number>>(new Set())
  const cfg = priorityConfig[section.priority]

  function toggle(i: number) {
    setChecked((prev) => {
      const next = new Set(prev)
      next.has(i) ? next.delete(i) : next.add(i)
      return next
    })
  }

  return (
    <div className={`rounded-lg border p-4 space-y-3 ${cfg.bg}`}>
      <div className="flex items-center gap-2">
        <span className={`w-2 h-2 rounded-full shrink-0 ${cfg.dot}`} />
        <h4 className={`text-sm font-bold ${cfg.color}`}>{section.category}</h4>
        <span className={`text-xs ${cfg.color} opacity-70`}>— {cfg.label}</span>
      </div>
      <ul className="space-y-2">
        {section.items.map((item, i) => (
          <li key={i} className="flex items-start gap-3">
            <button
              onClick={() => toggle(i)}
              className={`mt-0.5 w-4 h-4 rounded border shrink-0 flex items-center justify-center transition-all ${
                checked.has(i)
                  ? 'bg-emerald-500 border-emerald-500 text-white'
                  : 'border-slate-500 bg-slate-800 hover:border-slate-400'
              }`}
            >
              {checked.has(i) && <span className="text-xs leading-none">✓</span>}
            </button>
            <span className={`text-xs leading-relaxed ${checked.has(i) ? 'text-slate-500 line-through' : 'text-slate-300'}`}>
              {item}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function CautionScreen({ summary, contradictions, checklist }: Props) {
  return (
    <div className="space-y-6">
      {/* 경고 배너 */}
      <div className="bg-amber-500/10 border-2 border-amber-500/40 rounded-xl p-6">
        <div className="flex items-start gap-4">
          <div className="text-4xl shrink-0">⚠️</div>
          <div>
            <h3 className="text-base font-bold text-amber-400 mb-2">
              AI 판단 보류 — 현장 실사 강력 권고
            </h3>
            <p className="text-sm text-amber-200/80 leading-relaxed">
              {summary}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="text-xs bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-1 rounded">
                🏠 현장 방문 필수
              </span>
              <span className="text-xs bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-1 rounded">
                📄 법원 서류 추가 열람
              </span>
              <span className="text-xs bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-1 rounded">
                ⚖ 법률 전문가 검토
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 서류 모순 상세 */}
      {contradictions && contradictions.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
            <span className="text-red-400">🔍</span> AI가 발견한 서류 모순
          </h3>
          {contradictions.map((c, i) => (
            <ContradictionCard key={i} c={c} />
          ))}
        </div>
      )}

      {/* 조사 체크리스트 */}
      {checklist && checklist.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <span className="text-indigo-400">📋</span> 입찰 전 확인 체크리스트
            </h3>
            <span className="text-xs text-slate-500">클릭하여 완료 표시</span>
          </div>
          {checklist.map((section, i) => (
            <ChecklistSection key={i} section={section} />
          ))}
        </div>
      )}

      <p className="text-xs text-slate-500 text-center leading-relaxed">
        위 체크리스트를 모두 완료한 후에도 권리관계가 불명확하다면 입찰을 보류하십시오.<br />
        AlphaGround AI는 확보된 서류 데이터 내에서만 판단할 수 있습니다.
      </p>
    </div>
  )
}
