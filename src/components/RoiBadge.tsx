import type { LegalJudgment } from '@/types/property'

interface Props {
  roi: number
  judgment: LegalJudgment
}

export function RoiBadge({ roi, judgment }: Props) {
  const isHigh = roi >= 30 && judgment === 'PASS'
  const isMedium = roi >= 15 && judgment === 'PASS'

  const colorClass = isHigh
    ? 'text-emerald-400 bg-emerald-500/10'
    : isMedium
    ? 'text-amber-400 bg-amber-500/10'
    : 'text-slate-400 bg-slate-500/10'

  return (
    <span className={`font-bold text-lg px-2 py-0.5 rounded ${colorClass}`}>
      {roi.toFixed(1)}%
    </span>
  )
}
