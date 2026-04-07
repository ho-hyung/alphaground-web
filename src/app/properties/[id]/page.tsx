import { notFound } from 'next/navigation'
import Link from 'next/link'
import { readFile } from 'fs/promises'
import path from 'path'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { JudgmentBadge } from '@/components/JudgmentBadge'
import { SourceDocumentViewer } from '@/components/SourceDocumentViewer'
import { PropertyMap } from '@/components/PropertyMap'
import { CostBreakdown } from '@/components/CostBreakdown'
import { PaywallGate } from '@/components/PaywallGate'
import { AlertButton } from '@/components/AlertButton'
import { ConsultButton } from '@/components/ConsultButton'
import { CautionScreen } from '@/components/CautionScreen'
import { BookmarkButton } from '@/components/BookmarkButton'
import { RecentlyViewedTracker } from '@/components/RecentlyViewedTracker'
import { createClient } from '@/lib/supabase/server'
import { formatCurrency, formatDate, formatArea } from '@/lib/format'
import type { Property, PropertyReport, LegalCheck, RiskFactor } from '@/types/property'

interface PageProps {
  params: Promise<{ id: string }>
}

async function getPropertyDetail(caseNumber: string) {
  // public/data/ 우선 (Vercel 정적 파일), 없으면 data/ 폴백
  const listCandidates = [
    path.join(process.cwd(), 'public', 'data', 'properties.json'),
    path.join(process.cwd(), 'data', 'properties.json'),
  ]
  let listRaw = ''
  for (const p of listCandidates) {
    try {
      listRaw = await readFile(p, 'utf-8')
      break
    } catch { /* 다음 경로 시도 */ }
  }
  if (!listRaw) return null

  const properties: Property[] = JSON.parse(listRaw)
  const property = properties.find((p) => p.caseNumber === caseNumber)

  if (!property) return null

  let report: PropertyReport | null = null
  try {
    const reportPath = path.join(process.cwd(), 'data', 'reports', property.reportFile)
    const reportRaw = await readFile(reportPath, 'utf-8')
    report = JSON.parse(reportRaw)
  } catch {
    report = null
  }

  return { property, report }
}

const riskColors: Record<string, string> = {
  none: 'text-emerald-400',
  low: 'text-amber-400',
  medium: 'text-orange-400',
  high: 'text-red-400',
  critical: 'text-red-500',
}

const riskBgColors: Record<string, string> = {
  none: 'bg-emerald-500/10 border-emerald-500/20',
  low: 'bg-amber-500/10 border-amber-500/20',
  medium: 'bg-orange-500/10 border-orange-500/20',
  high: 'bg-red-500/10 border-red-500/20',
  critical: 'bg-red-500/20 border-red-500/40',
}

const PREMIUM_SCORE_THRESHOLD = 90

function CheckRow({ check }: { check: LegalCheck }) {
  const isPassed = check.result === 'PASS'
  const isRisky = check.riskLevel === 'high' || check.riskLevel === 'critical'

  return (
    <div
      className={`flex items-start gap-3 p-3 rounded-lg border ${
        isRisky ? riskBgColors[check.riskLevel] : 'bg-slate-800/30 border-slate-700/30'
      }`}
    >
      <span className={`text-lg font-bold mt-0.5 ${isPassed ? 'text-emerald-400' : 'text-red-400'}`}>
        {isPassed ? '✓' : '✗'}
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-sm font-medium text-slate-200">{check.category}</span>
          {!isPassed && (
            <Badge className={`text-xs px-1.5 py-0 ${riskColors[check.riskLevel]} bg-transparent border-current`}>
              {check.riskLevel.toUpperCase()}
            </Badge>
          )}
        </div>
        <p className={`text-xs leading-relaxed ${isRisky ? 'text-red-300' : 'text-slate-400'}`}>
          {check.description}
        </p>
      </div>
    </div>
  )
}

function RiskFactorRow({ factor }: { factor: RiskFactor }) {
  return (
    <div className={`p-4 rounded-lg border ${riskBgColors[factor.severity]}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-red-400 font-bold">⚠</span>
            <span className={`text-sm font-semibold ${riskColors[factor.severity]}`}>
              {factor.type}
            </span>
          </div>
          <p className="text-xs text-red-300 leading-relaxed">{factor.description}</p>
        </div>
        {factor.amount && (
          <div className="text-right shrink-0">
            <p className="text-xs text-slate-500">인수 금액</p>
            <p className={`text-sm font-bold ${riskColors[factor.severity]}`}>
              {formatCurrency(factor.amount)}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default async function PropertyDetailPage({ params }: PageProps) {
  const { id } = await params
  const caseNumber = decodeURIComponent(id)
  const result = await getPropertyDetail(caseNumber)

  if (!result) notFound()

  const { property, report } = result
  const discountRate = (
    ((property.estimatedValue - property.minimumBid) / property.estimatedValue) * 100
  ).toFixed(1)
  const isPremium = property.score >= PREMIUM_SCORE_THRESHOLD

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* 방문 기록 자동 저장 */}
      <RecentlyViewedTracker caseNumber={property.caseNumber} />

      <div className="flex items-center justify-between gap-2 text-sm text-slate-400">
        <div className="flex items-center gap-2">
          <Link href="/" className="hover:text-slate-200 transition-colors">
            ← 매물 목록
          </Link>
          <span>/</span>
          <span className="font-mono">{property.caseNumber}</span>
        </div>
        <BookmarkButton caseNumber={property.caseNumber} isLoggedIn={!!user} />
      </div>

      {/* 기본 정보 */}
      <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="font-mono text-xs text-slate-400">{property.caseNumber}</span>
              <JudgmentBadge judgment={property.legalJudgment} />
              {isPremium && (
                <span className="inline-flex items-center gap-1 bg-gradient-to-r from-amber-500 to-yellow-400 text-black text-xs font-bold px-2.5 py-0.5 rounded-full">
                  ★ PREMIUM
                </span>
              )}
            </div>
            <h1 className="text-xl font-bold text-white mb-1">
              {property.district} {property.propertyType}
            </h1>
            <p className="text-sm text-slate-400">{property.address}</p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-xs text-slate-500 mb-1">예상 수익률</p>
            <p
              className={`text-3xl font-black ${
                property.legalJudgment === 'PASS' && property.roi >= 25
                  ? 'text-emerald-400'
                  : 'text-slate-300'
              }`}
            >
              {property.roi.toFixed(1)}%
            </p>
            <p className="text-xs text-slate-500 mt-0.5">AI 점수 {property.score}/100</p>
          </div>
        </div>

        <Separator className="bg-slate-700/50 my-4" />

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <p className="text-xs text-slate-500 mb-1">최저입찰가</p>
            <p className="text-sm font-semibold text-slate-200">{formatCurrency(property.minimumBid)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-1">감정가</p>
            <p className="text-sm font-semibold text-slate-200">{formatCurrency(property.estimatedValue)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-1">할인율</p>
            <p className="text-sm font-semibold text-amber-400">{discountRate}%↓</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-1">경매일</p>
            <p className="text-sm font-semibold text-slate-200">{formatDate(property.auctionDate)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-1">면적</p>
            <p className="text-sm font-semibold text-slate-200">{formatArea(property.area)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-1">물건 종류</p>
            <p className="text-sm font-semibold text-slate-200">{property.propertyType}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-1">지역</p>
            <p className="text-sm font-semibold text-slate-200">{property.region}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-1">상태</p>
            <p className="text-sm font-semibold text-slate-200">{property.status}</p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-1">
          {property.tags.map((tag) => (
            <Badge key={tag} variant="outline" className="text-xs border-slate-600 text-slate-400">
              {tag}
            </Badge>
          ))}
        </div>
      </div>

      {/* 상세 분석 — 유료 멤버십 전용 */}
      <PaywallGate caseNumber={property.caseNumber} score={property.score}>
        {report ? (
          <div className="space-y-6">
            {/* 법률 권리분석 */}
            <section className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <span className="text-indigo-400">⚖</span> 법률 권리분석
                </h2>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">AI 신뢰 점수</span>
                  <span
                    className={`text-sm font-bold ${
                      report.legalAnalysis.score >= 70
                        ? 'text-emerald-400'
                        : report.legalAnalysis.score >= 50
                        ? 'text-amber-400'
                        : 'text-red-400'
                    }`}
                  >
                    {report.legalAnalysis.score}/100
                  </span>
                </div>
              </div>

              {/* CAUTION: 별도 화면으로 분기 */}
              {report.legalAnalysis.judgment === 'CAUTION' ? (
                <CautionScreen
                  summary={report.legalAnalysis.summary}
                  contradictions={report.legalAnalysis.contradictions}
                  checklist={report.cautionChecklist}
                />
              ) : (
                <>
                  <p className="text-sm text-slate-300 leading-relaxed bg-slate-700/30 rounded-lg p-3 border border-slate-600/30">
                    {report.legalAnalysis.summary}
                  </p>

                  {report.legalAnalysis.riskFactors.length > 0 && (
                    <div className="space-y-2">
                      <h3 className="text-sm font-semibold text-red-400 flex items-center gap-1">
                        ⚠ 주요 위험 요소
                      </h3>
                      {report.legalAnalysis.riskFactors.map((factor, i) => (
                        <RiskFactorRow key={i} factor={factor} />
                      ))}
                    </div>
                  )}

                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold text-slate-300">항목별 검토 결과</h3>
                    {report.legalAnalysis.checks.map((check, i) => (
                      <CheckRow key={i} check={check} />
                    ))}
                  </div>

                  {report.legalAnalysis.sourceDocuments && report.legalAnalysis.sourceDocuments.length > 0 && (
                    <SourceDocumentViewer documents={report.legalAnalysis.sourceDocuments} />
                  )}
                </>
              )}
            </section>

            {/* 입지 분석 */}
            <section className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <span className="text-emerald-400">📍</span> 입지 분석
                </h2>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">입지 점수</span>
                  <span className="text-sm font-bold text-emerald-400">
                    {report.locationAnalysis.score}/100
                  </span>
                </div>
              </div>

              <p className="text-sm text-slate-300 leading-relaxed bg-slate-700/30 rounded-lg p-3 border border-slate-600/30">
                {report.locationAnalysis.summary}
              </p>

              {property.lat && property.lng && (
                <PropertyMap
                  lat={property.lat}
                  lng={property.lng}
                  markers={report.locationAnalysis.mapMarkers}
                  address={property.address}
                />
              )}

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <h3 className="text-xs font-semibold text-emerald-400 mb-2 uppercase tracking-wide">
                    긍정 요소
                  </h3>
                  <ul className="space-y-1.5">
                    {report.locationAnalysis.positiveFactors.map((f, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-slate-300">
                        <span className="text-emerald-400 mt-0.5 shrink-0">+</span>
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3 className="text-xs font-semibold text-red-400 mb-2 uppercase tracking-wide">
                    부정 요소
                  </h3>
                  <ul className="space-y-1.5">
                    {report.locationAnalysis.negativeFactors.map((f, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-red-300">
                        <span className="text-red-400 mt-0.5 shrink-0">−</span>
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-700/30">
                <div>
                  <p className="text-xs text-slate-500 mb-0.5">예상 임대 수익률</p>
                  <p className="text-sm font-semibold text-amber-400">
                    {report.locationAnalysis.rentalYield}%/년
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-0.5">시세 전망</p>
                  <p className="text-sm font-semibold text-slate-200">
                    {report.locationAnalysis.appreciationForecast}
                  </p>
                </div>
              </div>
            </section>

            {/* 수익성 분석 */}
            <section className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-6 space-y-4">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span className="text-amber-400">💰</span> 수익성 분석
              </h2>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div className="bg-slate-700/30 rounded-lg p-3">
                  <p className="text-xs text-slate-500 mb-1">예상 취득 총비용</p>
                  <p className="text-lg font-bold text-white">
                    {formatCurrency(report.profitAnalysis.estimatedAcquisitionCost)}
                  </p>
                </div>
                <div className="bg-slate-700/30 rounded-lg p-3">
                  <p className="text-xs text-slate-500 mb-1">시장 가치</p>
                  <p className="text-lg font-bold text-slate-200">
                    {formatCurrency(report.profitAnalysis.marketValue)}
                  </p>
                </div>
                <div
                  className={`rounded-lg p-3 ${
                    report.profitAnalysis.projectedProfit > 0
                      ? 'bg-emerald-500/10 border border-emerald-500/20'
                      : 'bg-red-500/10 border border-red-500/20'
                  }`}
                >
                  <p className="text-xs text-slate-500 mb-1">예상 수익</p>
                  <p
                    className={`text-lg font-bold ${
                      report.profitAnalysis.projectedProfit > 0 ? 'text-emerald-400' : 'text-red-400'
                    }`}
                  >
                    {report.profitAnalysis.projectedProfit > 0 ? '+' : ''}
                    {formatCurrency(report.profitAnalysis.projectedProfit)}
                  </p>
                </div>
                <div className="bg-slate-700/30 rounded-lg p-3">
                  <p className="text-xs text-slate-500 mb-1">실질 수익률</p>
                  <p
                    className={`text-lg font-bold ${
                      report.profitAnalysis.roi >= 20 ? 'text-emerald-400' : 'text-amber-400'
                    }`}
                  >
                    {report.profitAnalysis.roi.toFixed(1)}%
                  </p>
                </div>
                <div className="bg-slate-700/30 rounded-lg p-3">
                  <p className="text-xs text-slate-500 mb-1">손익분기 기간</p>
                  <p className="text-lg font-bold text-slate-200">
                    {report.profitAnalysis.breakEvenMonths}개월
                  </p>
                </div>
              </div>

              {report.profitAnalysis.costBreakdown && report.profitAnalysis.costBreakdown.length > 0 && (
                <CostBreakdown
                  totalCost={report.profitAnalysis.estimatedAcquisitionCost}
                  items={report.profitAnalysis.costBreakdown}
                />
              )}

              <div className="bg-slate-700/30 rounded-lg p-3 border border-slate-600/30">
                <p className="text-xs text-slate-500 mb-1">출구 전략 제안</p>
                <p className="text-sm text-slate-300">{report.profitAnalysis.exitStrategy}</p>
              </div>
            </section>
          </div>
        ) : (
          <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-8 text-center">
            <p className="text-slate-400">상세 분석 리포트를 준비 중입니다...</p>
            <p className="text-xs text-slate-500 mt-1">AI 분석가가 데이터를 처리하고 있습니다</p>
          </div>
        )}
      </PaywallGate>

      {/* 액션 영역: 알림 신청 + 전문가 상담 */}
      <section className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-6 space-y-3">
        <h2 className="text-sm font-bold text-slate-300 mb-3">추가 서비스</h2>
        <AlertButton caseNumber={property.caseNumber} auctionDate={formatDate(property.auctionDate)} />
        <ConsultButton caseNumber={property.caseNumber} district={property.district} />
      </section>
    </div>
  )
}
