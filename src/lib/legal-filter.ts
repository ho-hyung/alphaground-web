/**
 * AlphaGround 법률 리스크 자동 필터링 엔진
 * ALP-6 legal-filter-script.py의 TypeScript 포팅
 *
 * 입력: PropertyAnalysisInput
 * 출력: AnalysisResult (verdict: PASS | FAIL | CAUTION)
 */

// ────────────────────────────────────────────────
// 데이터 모델
// ────────────────────────────────────────────────

export type Verdict = 'PASS' | 'FAIL' | 'CAUTION'

export interface RightRecord {
  rightType: string       // "근저당권", "가압류", "가처분", "가등기", "예고등기" 등
  registeredDate: string  // ISO 날짜 문자열 "YYYY-MM-DD"
  creditor: string
  amount?: number         // 채권액 (원)
  note?: string
}

export interface TenantRecord {
  unit: string
  moveInDate: string       // ISO 날짜 문자열
  confirmedDate?: string   // 확정일자 (없으면 undefined)
  deposit: number          // 보증금 (원)
  isOccupying?: boolean
}

export interface PropertyAnalysisInput {
  caseNumber: string
  appraisedValue: number
  rights: RightRecord[]
  tenants: TenantRecord[]
  specialNotesText?: string
  lienReported?: boolean
  lienOccupying?: boolean
  lienAmount?: number
  statutorySuperficiesRisk?: boolean
  unpaidMaintenanceFee?: number
  propertyType?: string
}

export interface RiskBreakdown {
  erasureBaseRight: string
  priorityTenantsCount: number
  lienRisk: boolean
  statutorySuperficiesRisk: boolean
  inheritedCostVsThreshold: string
}

export interface AnalysisResult {
  verdict: Verdict
  reasons: string[]
  inheritedCostEstimate: number
  riskBreakdown: RiskBreakdown
}

// ────────────────────────────────────────────────
// 상수
// ────────────────────────────────────────────────

const FAIL_KEYWORDS = [
  '유치권', '유치권신고', '미납공사대금',
  '법정지상권', '점유자불명', '예고등기',
]

const ERASURE_BASE_TYPES = new Set([
  '근저당권', '저당권', '담보가등기', '압류', '가압류', '경매개시결정',
])

// ────────────────────────────────────────────────
// 유틸리티
// ────────────────────────────────────────────────

function findErasureBaseRight(rights: RightRecord[]): RightRecord | null {
  const sorted = [...rights].sort(
    (a, b) => new Date(a.registeredDate).getTime() - new Date(b.registeredDate).getTime()
  )
  return sorted.find((r) => ERASURE_BASE_TYPES.has(r.rightType)) ?? null
}

function getPriorityTenants(tenants: TenantRecord[], erasureDate: string): TenantRecord[] {
  return tenants.filter((t) => t.moveInDate < erasureDate)
}

// ────────────────────────────────────────────────
// 핵심 분석 함수
// ────────────────────────────────────────────────

export function analyze(input: PropertyAnalysisInput): AnalysisResult {
  const failReasons: string[] = []
  const cautionReasons: string[] = []
  let inheritedCost = 0

  const specialNotes = input.specialNotesText ?? ''
  const appraisedValue = input.appraisedValue

  // 1. 키워드 즉시 FAIL 스캔
  for (const kw of FAIL_KEYWORDS) {
    if (specialNotes.includes(kw)) {
      failReasons.push(`[키워드 FAIL] 비고란 '${kw}' 발견 → 즉시 FAIL`)
    }
  }

  // 2. 말소기준권리 확정
  const erasureRight = findErasureBaseRight(input.rights)
  if (!erasureRight) {
    cautionReasons.push('[말소기준권리 미확정] 등기부에서 말소기준권리 특정 불가 → 전문가 검토 필수')
    const verdict: Verdict = failReasons.length > 0 ? 'FAIL' : 'CAUTION'
    return {
      verdict,
      reasons: [...failReasons, ...cautionReasons],
      inheritedCostEstimate: 0,
      riskBreakdown: {
        erasureBaseRight: '미확정',
        priorityTenantsCount: 0,
        lienRisk: false,
        statutorySuperficiesRisk: false,
        inheritedCostVsThreshold: '0원 / 0원',
      },
    }
  }

  const erasureDate = erasureRight.registeredDate

  // 3. 선순위 임차인 대항력 분석
  const priorityTenants = getPriorityTenants(input.tenants, erasureDate)
  for (const t of priorityTenants) {
    inheritedCost += t.deposit
    const hasPriorityConfirmed =
      t.confirmedDate !== undefined && t.confirmedDate < erasureDate
    if (!hasPriorityConfirmed) {
      failReasons.push(
        `[선순위 임차인 FAIL] ${t.unit} 전입=${t.moveInDate}, ` +
        `확정일자 없음/후순위 → 보증금 ${t.deposit.toLocaleString()}원 전액 인수 위험`
      )
    } else {
      cautionReasons.push(
        `[선순위 임차인 CAUTION] ${t.unit} 전입=${t.moveInDate}, ` +
        `확정일자=${t.confirmedDate} (우선변제권) → ` +
        `배당 부족 시 ${t.deposit.toLocaleString()}원 인수 가능성 잔존`
      )
    }
  }

  // 4. 유치권 리스크
  if (input.lienReported || input.lienOccupying) {
    const lienAmount = input.lienAmount ?? 0
    if (input.lienOccupying) {
      failReasons.push(
        `[유치권 FAIL] 신고 + 점유 확인 → 채권액 ${lienAmount.toLocaleString()}원 인수 위험`
      )
      inheritedCost += lienAmount
    } else {
      cautionReasons.push(
        `[유치권 CAUTION] 신고 있으나 점유 미확인 → ` +
        `채권액 ${lienAmount.toLocaleString()}원, 현장 확인 요`
      )
    }
  }

  // 5. 법정지상권 리스크
  if (input.statutorySuperficiesRisk) {
    failReasons.push('[법정지상권 FAIL] 법정지상권 성립 가능성 확인 → FAIL')
  }

  // 6. 선순위 가처분 / 가등기 / 예고등기
  for (const right of input.rights) {
    const isSenior = right.registeredDate < erasureDate
    const rt = right.rightType

    if (rt === '처분금지가처분' && isSenior) {
      failReasons.push(
        `[선순위 가처분 FAIL] 처분금지가처분 (${right.registeredDate}) 채권자=${right.creditor}`
      )
    } else if (rt === '점유이전금지가처분' && isSenior) {
      failReasons.push(
        `[선순위 가처분 FAIL] 점유이전금지가처분 (${right.registeredDate}) 채권자=${right.creditor}`
      )
    } else if (rt === '가처분' && isSenior) {
      cautionReasons.push(
        `[선순위 가처분 CAUTION] 가처분 (${right.registeredDate}) 채권자=${right.creditor} → 내용 및 본안소송 확인 요`
      )
    } else if (rt === '가등기' && isSenior) {
      failReasons.push(
        `[선순위 가등기 FAIL] 소유권이전청구권 가등기 (${right.registeredDate}) 신청인=${right.creditor} → 소유권 인수 리스크`
      )
    } else if (rt === '예고등기' && isSenior) {
      failReasons.push(
        `[예고등기 FAIL] 예고등기 (${right.registeredDate}) → 소유권 관련 소송 진행 중`
      )
    }
  }

  // 7. 총 인수비용 임계값 (감정가 20%)
  const maintenanceFee = input.unpaidMaintenanceFee ?? 0
  inheritedCost += maintenanceFee
  const threshold = appraisedValue * 0.20
  if (inheritedCost > threshold) {
    failReasons.push(
      `[비용 임계값 FAIL] 총 인수비용 ${inheritedCost.toLocaleString()}원 > ` +
      `감정가 20% (${threshold.toLocaleString()}원) → FAIL`
    )
  }

  // 8. CAUTION 추가 조건
  if (maintenanceFee > 0) {
    cautionReasons.push(`[관리비 CAUTION] 체납 ${maintenanceFee.toLocaleString()}원 → 승계 여부 확인`)
  }

  // 9. 최종 판정
  let verdict: Verdict
  let reasons: string[]

  if (failReasons.length > 0) {
    verdict = 'FAIL'
    reasons = [...failReasons, ...cautionReasons]
  } else if (cautionReasons.length > 0) {
    verdict = 'CAUTION'
    reasons = cautionReasons
  } else {
    verdict = 'PASS'
    reasons = ['[PASS] 모든 FAIL / CAUTION 조건 미해당. 권리관계 이상 없음.']
  }

  return {
    verdict,
    reasons,
    inheritedCostEstimate: inheritedCost,
    riskBreakdown: {
      erasureBaseRight: `${erasureRight.rightType} (${erasureDate})`,
      priorityTenantsCount: priorityTenants.length,
      lienRisk: !!(input.lienReported || input.lienOccupying),
      statutorySuperficiesRisk: !!input.statutorySuperficiesRisk,
      inheritedCostVsThreshold: `${inheritedCost.toLocaleString()}원 / ${threshold.toLocaleString()}원`,
    },
  }
}
