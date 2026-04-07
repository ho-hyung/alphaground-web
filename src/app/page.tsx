import { Suspense } from 'react'
import { readFile } from 'fs/promises'
import path from 'path'
import { PropertyCard } from '@/components/PropertyCard'
import { FilterBar } from '@/components/FilterBar'
import type { Property } from '@/types/property'

async function getProperties(searchParams: Record<string, string | string[] | undefined>) {
  const dataPath = path.join(process.cwd(), 'data', 'properties.json')
  const raw = await readFile(dataPath, 'utf-8')
  let properties: Property[] = JSON.parse(raw)

  const region = typeof searchParams.region === 'string' ? searchParams.region : 'all'
  const minRoi = parseFloat(typeof searchParams.minRoi === 'string' ? searchParams.minRoi : '0')
  const judgment = typeof searchParams.judgment === 'string' ? searchParams.judgment : 'all'

  const total = properties.length

  if (region !== 'all') {
    properties = properties.filter((p) => p.region === region)
  }
  if (minRoi > 0) {
    properties = properties.filter((p) => p.roi >= minRoi)
  }
  if (judgment !== 'all') {
    properties = properties.filter((p) => p.legalJudgment === judgment)
  }

  return { properties, total }
}

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function HomePage({ searchParams }: PageProps) {
  const params = await searchParams
  const { properties, total } = await getProperties(params)

  const passCount = properties.filter((p) => p.legalJudgment === 'PASS').length
  const avgRoi =
    properties.length > 0
      ? (properties.reduce((sum, p) => sum + p.roi, 0) / properties.length).toFixed(1)
      : '0'

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white mb-1">경매 매물 분석</h1>
        <p className="text-sm text-slate-400">
          AI가 실시간으로 권리분석과 수익성을 판단합니다
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-4">
          <p className="text-xs text-slate-500 mb-1">총 매물</p>
          <p className="text-2xl font-bold text-white">{properties.length}</p>
          <p className="text-xs text-slate-400 mt-0.5">전체 {total}개 중 필터됨</p>
        </div>
        <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-4">
          <p className="text-xs text-slate-500 mb-1">PASS 매물</p>
          <p className="text-2xl font-bold text-emerald-400">{passCount}</p>
          <p className="text-xs text-slate-400 mt-0.5">
            {properties.length > 0 ? ((passCount / properties.length) * 100).toFixed(0) : 0}% 통과율
          </p>
        </div>
        <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-4">
          <p className="text-xs text-slate-500 mb-1">평균 수익률</p>
          <p className="text-2xl font-bold text-indigo-400">{avgRoi}%</p>
          <p className="text-xs text-slate-400 mt-0.5">필터 기준</p>
        </div>
      </div>

      <Suspense>
        <FilterBar totalCount={total} filteredCount={properties.length} />
      </Suspense>

      {properties.length === 0 ? (
        <div className="text-center py-16 text-slate-500">
          <p className="text-lg mb-2">조건에 맞는 매물이 없습니다</p>
          <p className="text-sm">필터 조건을 변경해 보세요</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {properties.map((property) => (
            <PropertyCard key={property.id} property={property} />
          ))}
        </div>
      )}
    </div>
  )
}
