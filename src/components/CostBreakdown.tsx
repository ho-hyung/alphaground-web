'use client'

import { useState } from 'react'
import { formatCurrency } from '@/lib/format'
import type { CostItem } from '@/types/property'

interface Props {
  totalCost: number
  items: CostItem[]
}

export function CostBreakdown({ totalCost, items }: Props) {
  const [expanded, setExpanded] = useState(false)

  const isWarning = (item: CostItem) =>
    item.note.startsWith('⚠') || item.item.includes('인수') || item.item.includes('소송')

  return (
    <div className="border border-slate-700/30 rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 bg-slate-700/20 hover:bg-slate-700/40 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <span className="text-amber-400 text-sm">🧾</span>
          <span className="text-sm font-medium text-slate-200">취득 비용 상세 내역</span>
          <span className="text-xs text-slate-400">총 {formatCurrency(totalCost)}</span>
        </div>
        <span className="text-xs text-slate-400">{expanded ? '▲ 접기' : '▼ 펼치기'}</span>
      </button>

      {expanded && (
        <div className="p-4 space-y-1.5">
          {items.map((item, i) => (
            <div
              key={i}
              className={`flex items-start justify-between gap-3 px-3 py-2 rounded-lg ${
                isWarning(item)
                  ? 'bg-red-500/10 border border-red-500/20'
                  : 'bg-slate-700/20'
              }`}
            >
              <div className="flex-1 min-w-0">
                <p className={`text-xs font-medium ${isWarning(item) ? 'text-red-300' : 'text-slate-200'}`}>
                  {item.item}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">{item.note}</p>
              </div>
              <p className={`text-sm font-semibold shrink-0 ${
                isWarning(item) ? 'text-red-400' : item.amount === 0 ? 'text-slate-500' : 'text-slate-200'
              }`}>
                {item.amount === 0 ? '—' : formatCurrency(item.amount)}
              </p>
            </div>
          ))}

          <div className="flex items-center justify-between px-3 py-2.5 mt-2 bg-slate-700/40 rounded-lg border border-slate-600/50">
            <span className="text-sm font-bold text-slate-200">합계</span>
            <span className="text-base font-black text-white">{formatCurrency(totalCost)}</span>
          </div>
        </div>
      )}
    </div>
  )
}
