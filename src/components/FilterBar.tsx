'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useCallback } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'

const ROI_OPTIONS = [
  { value: '0', label: '전체 수익률' },
  { value: '15', label: '15% 이상' },
  { value: '20', label: '20% 이상' },
  { value: '25', label: '25% 이상' },
  { value: '30', label: '30% 이상' },
]

const REGION_OPTIONS = [
  { value: 'all', label: '전체 지역' },
  { value: '서울', label: '서울' },
  { value: '경기', label: '경기' },
  { value: '인천', label: '인천' },
]

const JUDGMENT_OPTIONS = [
  { value: 'all', label: '전체 판정' },
  { value: 'PASS', label: 'PASS만 보기' },
  { value: 'FAIL', label: 'FAIL만 보기' },
]

interface Props {
  totalCount: number
  filteredCount: number
}

export function FilterBar({ totalCount, filteredCount }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const updateFilter = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString())
      if (value === 'all' || value === '0') {
        params.delete(key)
      } else {
        params.set(key, value)
      }
      router.push(`${pathname}?${params.toString()}`)
    },
    [router, pathname, searchParams]
  )

  const currentRegion = searchParams.get('region') ?? 'all'
  const currentMinRoi = searchParams.get('minRoi') ?? '0'
  const currentJudgment = searchParams.get('judgment') ?? 'all'
  const hasActiveFilters = currentRegion !== 'all' || currentMinRoi !== '0' || currentJudgment !== 'all'

  return (
    <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 mr-2">
          <span className="text-sm font-medium text-slate-300">필터</span>
          {hasActiveFilters && (
            <Badge className="bg-indigo-500/20 text-indigo-400 border-indigo-500/30 text-xs">
              활성
            </Badge>
          )}
        </div>

        <Select value={currentRegion} onValueChange={(v: string | null) => updateFilter('region', v ?? 'all')}>
          <SelectTrigger className="w-[140px] bg-slate-700/50 border-slate-600 text-slate-200 text-sm h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-slate-800 border-slate-700">
            {REGION_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value} className="text-slate-200">
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={currentMinRoi} onValueChange={(v: string | null) => updateFilter('minRoi', v ?? '0')}>
          <SelectTrigger className="w-[140px] bg-slate-700/50 border-slate-600 text-slate-200 text-sm h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-slate-800 border-slate-700">
            {ROI_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value} className="text-slate-200">
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={currentJudgment} onValueChange={(v: string | null) => updateFilter('judgment', v ?? 'all')}>
          <SelectTrigger className="w-[140px] bg-slate-700/50 border-slate-600 text-slate-200 text-sm h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-slate-800 border-slate-700">
            {JUDGMENT_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value} className="text-slate-200">
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="ml-auto text-sm text-slate-400">
          <span className="text-slate-200 font-medium">{filteredCount}</span>
          <span> / {totalCount}개 매물</span>
        </div>
      </div>
    </div>
  )
}
