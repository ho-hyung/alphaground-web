import { Badge } from '@/components/ui/badge'
import type { LegalJudgment } from '@/types/property'

interface Props {
  judgment: LegalJudgment
}

export function JudgmentBadge({ judgment }: Props) {
  if (judgment === 'PASS') {
    return (
      <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/30 font-bold text-xs px-2 py-0.5">
        ✓ PASS
      </Badge>
    )
  }
  if (judgment === 'CAUTION') {
    return (
      <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 hover:bg-amber-500/30 font-bold text-xs px-2 py-0.5">
        ⚠ CAUTION
      </Badge>
    )
  }
  return (
    <Badge className="bg-red-500/20 text-red-400 border-red-500/30 hover:bg-red-500/30 font-bold text-xs px-2 py-0.5">
      ✗ FAIL
    </Badge>
  )
}
