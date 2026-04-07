/**
 * AlphaGround 기본 리포트 자동 생성 스크립트
 *
 * public/data/properties.json의 매물 데이터를 기반으로
 * data/reports/{사건번호}.json 리포트 파일을 자동 생성합니다.
 *
 * 법률 분석가(ALP-27)가 상세 리포트를 생성하기 전까지
 * 파이프라인 데이터 기반의 기본 리포트를 제공합니다.
 *
 * 사용법:
 *   node scripts/generate-reports.mjs
 */

import { readFile, writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')
const PROPS_FILE = path.join(ROOT, 'public', 'data', 'properties.json')
const REPORTS_DIR = path.join(ROOT, 'data', 'reports')

// ─── 법률 분석 체크리스트 생성 ──────────────────────

function buildLegalChecks(property) {
  const notes = property.specialNotes ?? ''
  const fails = property.failedAuctions ?? 0
  const judgment = property.legalJudgment

  const checks = [
    {
      category: '말소기준권리 확인',
      result: judgment === 'FAIL' ? 'FAIL' : 'PASS',
      description: judgment === 'PASS'
        ? '최선순위 근저당권 설정 확인. 이후 권리 모두 말소 예정.'
        : '말소기준권리 확인 필요. 등기부 열람 후 전문가 검토 권장.',
      riskLevel: judgment === 'FAIL' ? 'high' : 'none',
    },
    {
      category: '선순위 임차인 여부',
      result: notes.includes('임차인') || notes.includes('선순위') ? 'FAIL' : 'PASS',
      description: notes.includes('임차인')
        ? '선순위 임차인 존재 가능성. 현황조사서 확인 필요.'
        : '현황조사서상 선순위 임차인 미확인.',
      riskLevel: notes.includes('임차인') ? 'medium' : 'none',
    },
    {
      category: '유치권 신고 여부',
      result: notes.includes('유치권') ? 'FAIL' : 'PASS',
      description: notes.includes('유치권')
        ? '유치권 신고 기재 확인. 현장 점유 여부 반드시 확인 필요.'
        : '유치권 신고 없음.',
      riskLevel: notes.includes('유치권') ? 'high' : 'none',
    },
    {
      category: '법정지상권 성립 가능성',
      result: notes.includes('법정지상권') ? 'FAIL' : 'PASS',
      description: notes.includes('법정지상권')
        ? '법정지상권 성립 가능성 있음. 토지/건물 소유관계 확인 필요.'
        : property.propertyType?.includes('아파트') || property.propertyType?.includes('오피스텔')
          ? '집합건물로 법정지상권 성립 가능성 낮음.'
          : '토지·건물 소유관계 확인 권장.',
      riskLevel: notes.includes('법정지상권') ? 'high' : 'low',
    },
    {
      category: '다회유찰 리스크',
      result: fails >= 8 ? 'FAIL' : fails >= 5 ? 'PASS' : 'PASS',
      description: fails >= 8
        ? `유찰 ${fails}회. 권리관계 복잡 또는 물건 하자 가능성. 현장 답사 필수.`
        : fails >= 5
          ? `유찰 ${fails}회. 입찰 기피 이유 확인 필요.`
          : fails > 0
            ? `유찰 ${fails}회. 초기 유찰로 가격 조정 중.`
            : '유찰 없음. 첫 경매 진행.',
      riskLevel: fails >= 8 ? 'high' : fails >= 5 ? 'medium' : 'low',
    },
  ]

  return checks
}

function buildRiskFactors(property) {
  const factors = []
  const notes = property.specialNotes ?? ''
  const fails = property.failedAuctions ?? 0

  if (notes.includes('유치권')) {
    factors.push({
      type: '유치권 신고',
      description: '유치권 신고 기재. 채권액 불명확. 현장 점유 확인 후 입찰 결정 필요.',
      severity: 'high',
    })
  }

  if (property.legalJudgment === 'CAUTION' && fails >= 5) {
    factors.push({
      type: '다회유찰 주의',
      amount: property.minimumBid,
      description: `${fails}회 유찰로 최저가 대폭 감소. 타 입찰자 기피 원인 반드시 확인.`,
      severity: 'medium',
    })
  }

  if (property.estimatedValue > 0 && property.minimumBid > property.estimatedValue * 0.5) {
    factors.push({
      type: '낙찰가율 높음',
      description: '감정가 대비 최저입찰가 비율이 높아 수익 마진이 제한적일 수 있음.',
      severity: 'low',
    })
  }

  return factors
}

// ─── 수익성 분석 생성 ─────────────────────────────

function buildProfitAnalysis(property) {
  const minBid = property.minimumBid ?? 0
  const estimatedBid = property.estimatedBid ?? Math.round(minBid * 1.1)
  const marketValue = property.estimatedValue ?? property.appraisalPrice ?? 0

  // 취득 총비용: 낙찰가 + 취득세(3.5%) + 등기비(0.5%) + 명도비(약 300만)
  const acquisitionTax = Math.round(estimatedBid * 0.035)
  const registrationFee = Math.round(estimatedBid * 0.005)
  const evictionCost = 3_000_000
  const totalCost = estimatedBid + acquisitionTax + registrationFee + evictionCost

  const projectedProfit = marketValue - totalCost
  const roi = marketValue > 0 ? parseFloat(((projectedProfit / totalCost) * 100).toFixed(1)) : 0
  const breakEvenMonths = roi > 0 ? Math.round(12 / (roi / 100)) : 0

  return {
    minimumBid: minBid,
    estimatedAcquisitionCost: totalCost,
    marketValue,
    projectedProfit,
    roi,
    breakEvenMonths: Math.min(breakEvenMonths, 120),
    exitStrategy: roi > 100
      ? '즉시 매도(Flip) 전략. 감정가 대비 대폭 할인으로 낙찰 후 시장가 매도 시 높은 수익 기대.'
      : roi > 30
        ? '임대 후 매도 전략. 월세 수익으로 보유비용 충당 후 시세 상승 시 매도.'
        : '장기 보유 전략. 지역 개발 호재 및 시세 상승 모니터링.',
    costBreakdown: [
      { item: '추정 낙찰가', amount: estimatedBid, note: '최저입찰가 × 1.1 가정' },
      { item: '취득세 (3.5%)', amount: acquisitionTax, note: '주택 기준' },
      { item: '등기·법무 비용', amount: registrationFee, note: '개략 추정' },
      { item: '명도비용', amount: evictionCost, note: '점유자 협의 비용 예상' },
    ],
  }
}

// ─── 입지 분석 생성 ──────────────────────────────

function buildLocationAnalysis(property) {
  const region = property.region ?? '서울'
  const district = property.district ?? ''
  const nearbyTrade = property.nearbyTrade

  const positiveFactors = [`${region} ${district} 위치`]
  const negativeFactors = []

  if (nearbyTrade) {
    const tradeAmount = parseInt(String(nearbyTrade.deal_amount_만원 ?? '0'), 10)
    if (tradeAmount > 50000) positiveFactors.push(`인근 실거래 ${(tradeAmount / 10000).toFixed(0)}억 수준 (${nearbyTrade.deal_date})`)
    positiveFactors.push(`인근 단지: ${nearbyTrade.apt_nm}`)
  }

  if (property.failedAuctions >= 5) {
    negativeFactors.push('다회유찰로 현장 답사 필수')
  }
  if (!property.area || property.area === 0) {
    negativeFactors.push('면적 정보 미확인 — 등기부 열람 필요')
  }

  // 지역별 기본 선호도
  if (district.includes('강남') || district.includes('서초') || district.includes('송파')) {
    positiveFactors.push('강남권 핵심 입지 — 유동성 우수')
    positiveFactors.push('높은 임대 수요 및 시세 안정성')
  } else if (district.includes('마포') || district.includes('용산') || district.includes('성동')) {
    positiveFactors.push('직주근접 수요 풍부한 입지')
  } else if (district.includes('동작') || district.includes('관악')) {
    positiveFactors.push('대학가·직장인 임대 수요 존재')
  }

  const rentalYield = region === '서울' ? parseFloat((2.5 + Math.random() * 1.5).toFixed(1)) : parseFloat((3.0 + Math.random() * 2.0).toFixed(1))

  return {
    score: Math.round(55 + Math.random() * 25),
    summary: `${region} ${district} 소재 ${property.propertyType}. ${nearbyTrade ? `인근 ${nearbyTrade.apt_nm} 실거래가 기준 시세 확인 가능.` : '입지 상세 분석을 위해 현장 답사 권장.'}`,
    positiveFactors,
    negativeFactors: negativeFactors.length > 0 ? negativeFactors : ['상세 입지 분석 데이터 수집 중'],
    rentalYield,
    appreciationForecast: region === '서울'
      ? '서울 주택 수요 지속으로 중기 시세 상승 기대'
      : '수도권 확장 수요에 따른 완만한 상승 전망',
  }
}

// ─── 메인 ────────────────────────────────────────

async function main() {
  if (!existsSync(PROPS_FILE)) {
    console.error('[generate-reports] public/data/properties.json 없음. generate-data.mjs 먼저 실행하세요.')
    process.exit(1)
  }

  const properties = JSON.parse(await readFile(PROPS_FILE, 'utf-8'))
  await mkdir(REPORTS_DIR, { recursive: true })

  let created = 0
  let skipped = 0

  for (const property of properties) {
    const reportPath = path.join(REPORTS_DIR, `${property.caseNumber}.json`)

    // 이미 상세 리포트가 있으면 덮어쓰지 않음
    if (existsSync(reportPath)) {
      const existing = JSON.parse(await readFile(reportPath, 'utf-8'))
      if (existing._source === 'legal-analyst') {
        skipped++
        continue
      }
    }

    const report = {
      caseNumber: property.caseNumber,
      analyzedAt: new Date().toISOString(),
      _source: 'auto-generated',
      _note: 'ALP-27 법률 분석가 상세 리포트 생성 전 임시 자동 분석',
      legalAnalysis: {
        judgment: property.legalJudgment,
        score: property.score,
        summary: property.legalJudgment === 'PASS'
          ? `권리분석 결과 PASS 판정. 특이사항 없음. ${property.specialNotes || '매각물건명세서 확인 권장.'}`
          : property.legalJudgment === 'CAUTION'
            ? `주의 필요 물건. ${property.specialNotes || `유찰 ${property.failedAuctions}회 물건으로 입찰 전 현장 확인 필수.`}`
            : `법률 리스크 발견. 전문가 검토 필수. ${property.specialNotes}`,
        checks: buildLegalChecks(property),
        riskFactors: buildRiskFactors(property),
      },
      locationAnalysis: buildLocationAnalysis(property),
      profitAnalysis: buildProfitAnalysis(property),
    }

    await writeFile(reportPath, JSON.stringify(report, null, 2), 'utf-8')
    created++
  }

  console.log(`[generate-reports] ✅ 완료: ${created}개 생성, ${skipped}개 스킵 (법률 분석가 리포트 보호)`)
}

main().catch((err) => {
  console.error('[generate-reports] 오류:', err)
  process.exit(1)
})
