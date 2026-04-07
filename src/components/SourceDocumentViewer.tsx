'use client'

import { useState } from 'react'
import type { SourceDocument } from '@/types/property'

interface Props {
  documents: SourceDocument[]
}

export function SourceDocumentViewer({ documents }: Props) {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
        <span className="text-blue-400">📄</span> AI 판단 근거 서류
      </h3>
      {documents.map((doc, i) => (
        <div key={i} className="border border-slate-700/50 rounded-lg overflow-hidden">
          <button
            onClick={() => setOpenIndex(openIndex === i ? null : i)}
            className="w-full flex items-center justify-between px-4 py-3 bg-slate-700/30 hover:bg-slate-700/50 transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              <span className="text-xs font-mono bg-blue-500/20 text-blue-300 border border-blue-500/30 px-2 py-0.5 rounded">
                {doc.docType}
              </span>
              <span className="text-xs text-slate-400">{doc.docDate} 발급</span>
            </div>
            <span className="text-slate-400 text-xs">{openIndex === i ? '▲ 닫기' : '▼ 원문 보기'}</span>
          </button>

          {openIndex === i && (
            <div className="p-4 space-y-3">
              <div className="bg-slate-900/60 border border-slate-600/30 rounded-lg p-3 font-mono text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">
                {doc.excerpt.split(doc.highlight).map((part, idx, arr) => (
                  <span key={idx}>
                    {part}
                    {idx < arr.length - 1 && (
                      <mark className="bg-yellow-400/30 text-yellow-200 border border-yellow-500/30 rounded px-0.5 not-italic">
                        {doc.highlight}
                      </mark>
                    )}
                  </span>
                ))}
              </div>
              <div className="flex items-start gap-2 text-xs text-slate-400 bg-indigo-500/10 border border-indigo-500/20 rounded-lg p-2">
                <span className="text-indigo-400 shrink-0 mt-0.5">💡</span>
                <span>{doc.relevance}</span>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
