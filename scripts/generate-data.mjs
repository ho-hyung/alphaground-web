/**
 * AlphaGround 데이터 자동화 스크립트
 *
 * 수집된 경매 매물 데이터(pipeline/)를 Next.js가 읽을 수 있는
 * JSON 형식으로 변환하여 public/data/ 폴더에 저장합니다.
 *
 * 사용법:
 *   node scripts/generate-data.mjs
 *   node scripts/generate-data.mjs --input ../../pipeline/alpha_report.json
 *
 * GitHub Actions에서 커밋 시마다 자동 실행됩니다 (.github/workflows/update-data.yml)
 *
 * 향후 Supabase 연동 시:
 *   - SUPABASE_URL, SUPABASE_ANON_KEY 환경변수 설정
 *   - uploadToSupabase() 함수 주석 해제 후 사용
 */

import { readFile, writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')

// ─── 설정 ────────────────────────────────────────

const DEFAULT_INPUT = path.join(ROOT, '..', 'pipeline', 'alpha_report.json')
const OUTPUT_DIR = path.join(ROOT, 'public', 'data')
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'properties.json')

// ─── 주소에서 지역 추출 ───────────────────────────

function extractRegion(address) {
  if (address.startsWith('서울')) return '서울'
  if (address.startsWith('경기')) return '경기'
  if (address.startsWith('인천')) return '인천'
  return '기타'
}

function extractDistrict(address) {
  const parts = address.split(' ')
  // 예: "서울특별시 강남구 역삼동" → "강남구"
  for (const part of parts) {
    if (part.endsWith('구') || part.endsWith('시') || part.endsWith('군')) {
      return part
    }
  }
  return parts[1] ?? ''
}

// ─── 법률 판정 로직 (특이사항 기반 간이 판정) ──────

const FAIL_KEYWORDS = ['유치권', '유치권신고', '미납공사대금', '법정지상권', '점유자불명']
const CAUTION_KEYWORDS = ['임차인', '선순위', '관리비', '가처분', '가등기']

function inferLegalJudgment(specialNotes, failedAuctions) {
  const notes = String(specialNotes ?? '')
  const fails = parseInt(String(failedAuctions ?? '0'), 10)

  if (FAIL_KEYWORDS.some((kw) => notes.includes(kw))) return 'FAIL'
  if (CAUTION_KEYWORDS.some((kw) => notes.includes(kw))) return 'CAUTION'
  if (fails >= 5) return 'CAUTION'
  return 'PASS'
}

function inferRiskLevel(judgment, yieldPct) {
  if (judgment === 'FAIL') return 'high'
  if (judgment === 'CAUTION') return 'medium'
  if (yieldPct > 200) return 'medium'  // 수익률이 비현실적으로 높으면 데이터 이상 가능성
  return 'low'
}

// ─── 파이프라인 데이터 → Property 형식 변환 ─────────

function transformProperty(raw, index) {
  const roi = Math.min(raw.yield_pct ?? 0, 999.9)  // 이상치 cap
  const judgment = inferLegalJudgment(raw.special_notes, raw.failed_auctions)
  const riskLevel = inferRiskLevel(judgment, raw.yield_pct)

  return {
    id: raw.case_id,
    caseNumber: raw.case_id,
    region: extractRegion(raw.address ?? ''),
    district: extractDistrict(raw.address ?? ''),
    address: raw.address ?? '',
    propertyType: raw.property_type ?? '기타',
    area: 0,  // 파이프라인 데이터에 면적 없음 - 추후 보완
    minimumBid: raw.min_bid_price ?? 0,
    estimatedValue: raw.market_price ?? raw.appraisal_price ?? 0,
    roi: parseFloat(roi.toFixed(1)),
    legalJudgment: judgment,
    riskLevel,
    auctionDate: raw.auction_date ?? '',
    status: '예정',
    score: Math.max(0, Math.min(100, Math.round(50 + roi / 20))),
    summary: buildSummary(raw),
    tags: buildTags(raw, judgment),
    reportFile: `${raw.case_id}.json`,
    court: raw.court ?? '',
    appraisalPrice: raw.appraisal_price ?? 0,
    estimatedBid: raw.estimated_bid ?? 0,
    failedAuctions: parseInt(String(raw.failed_auctions ?? '0'), 10),
    nearbyTrade: raw.nearby_trade ?? null,
    specialNotes: raw.special_notes ?? '',
    generatedAt: new Date().toISOString(),
    _rank: index + 1,
  }
}

function buildSummary(raw) {
  const court = raw.court ?? ''
  const failCount = parseInt(String(raw.failed_auctions ?? '0'), 10)
  const ratio = raw.bid_ratio_pct ? `감정가 대비 ${raw.bid_ratio_pct}%` : ''
  const failNote = failCount > 0 ? ` 유찰 ${failCount}회.` : ''
  const notes = raw.special_notes ? ` ${raw.special_notes}` : ''
  return `${court}. ${ratio}${failNote}${notes}`.trim()
}

function buildTags(raw, judgment) {
  const tags = []
  const fails = parseInt(String(raw.failed_auctions ?? '0'), 10)
  const ratio = raw.bid_ratio_pct ?? 100

  if (fails >= 5) tags.push('다회유찰')
  if (ratio < 50) tags.push('대폭할인')
  if (judgment === 'PASS') tags.push('권리안정')
  if (judgment === 'CAUTION') tags.push('주의필요')
  if (raw.property_type?.includes('아파트')) tags.push('아파트')
  if (raw.property_type?.includes('오피스텔')) tags.push('오피스텔')

  return tags
}

// ─── 메인 ────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2)
  const inputIdx = args.indexOf('--input')
  const inputPath = inputIdx !== -1 ? args[inputIdx + 1] : DEFAULT_INPUT

  if (!existsSync(inputPath)) {
    console.error(`[generate-data] 입력 파일을 찾을 수 없습니다: ${inputPath}`)
    console.error('  --input <경로> 옵션으로 직접 지정하거나')
    console.error('  pipeline/alpha_report.json 파일이 있는지 확인하세요.')
    process.exit(1)
  }

  console.log(`[generate-data] 입력: ${inputPath}`)

  const raw = JSON.parse(await readFile(inputPath, 'utf-8'))
  const records = Array.isArray(raw) ? raw : (raw.properties ?? [])

  console.log(`[generate-data] ${records.length}개 매물 처리 중...`)

  const properties = records.map(transformProperty)

  // 수익률 기준 정렬 (높은 순), FAIL은 뒤로
  properties.sort((a, b) => {
    if (a.legalJudgment === 'FAIL' && b.legalJudgment !== 'FAIL') return 1
    if (b.legalJudgment === 'FAIL' && a.legalJudgment !== 'FAIL') return -1
    return b.roi - a.roi
  })

  await mkdir(OUTPUT_DIR, { recursive: true })
  await writeFile(OUTPUT_FILE, JSON.stringify(properties, null, 2), 'utf-8')

  const passCount = properties.filter((p) => p.legalJudgment === 'PASS').length
  const cautionCount = properties.filter((p) => p.legalJudgment === 'CAUTION').length
  const failCount = properties.filter((p) => p.legalJudgment === 'FAIL').length

  console.log(`[generate-data] ✅ 완료: ${OUTPUT_FILE}`)
  console.log(`  PASS: ${passCount} | CAUTION: ${cautionCount} | FAIL: ${failCount}`)
  console.log(`  총 ${properties.length}개 매물`)

  // ─── Supabase 연동 준비 (향후 활성화) ─────────────
  // const supabaseUrl = process.env.SUPABASE_URL
  // const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  // if (supabaseUrl && supabaseKey) {
  //   await uploadToSupabase(properties, supabaseUrl, supabaseKey)
  // }
}

main().catch((err) => {
  console.error('[generate-data] 오류:', err)
  process.exit(1)
})
