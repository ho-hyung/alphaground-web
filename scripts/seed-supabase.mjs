/**
 * AlphaGround — Supabase properties 시드 스크립트
 *
 * pipeline/alpha_report.json 의 실제 매물 데이터를
 * Supabase public.properties 테이블에 업로드합니다.
 *
 * 사용법:
 *   SUPABASE_URL=https://xxx.supabase.co \
 *   SUPABASE_SERVICE_ROLE_KEY=eyJ... \
 *   node scripts/seed-supabase.mjs
 *
 * ⚠️  서비스 롤 키(SERVICE_ROLE_KEY)가 필요합니다.
 *     anon key로는 RLS를 통과하지 못합니다.
 */

import { readFile } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { createClient } from '@supabase/supabase-js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')
const INPUT_PATH = path.join(ROOT, '..', 'pipeline', 'alpha_report.json')

// ─── 환경 변수 확인 ───────────────────────────────

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ 환경 변수 누락')
  console.error('  SUPABASE_URL (또는 NEXT_PUBLIC_SUPABASE_URL)')
  console.error('  SUPABASE_SERVICE_ROLE_KEY')
  console.error('')
  console.error('사용법:')
  console.error('  SUPABASE_URL=https://xxx.supabase.co SUPABASE_SERVICE_ROLE_KEY=eyJ... node scripts/seed-supabase.mjs')
  process.exit(1)
}

// ─── 변환 함수 ────────────────────────────────────

function extractRegion(address) {
  if (address.startsWith('서울')) return '서울'
  if (address.startsWith('경기')) return '경기'
  if (address.startsWith('인천')) return '인천'
  return '기타'
}

function extractDistrict(address) {
  const parts = address.split(' ')
  for (const part of parts) {
    if (part.endsWith('구') || part.endsWith('시') || part.endsWith('군')) return part
  }
  return parts[1] ?? ''
}

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

function calcRoi(raw) {
  const estimatedBid = raw.estimated_bid ?? Math.round((raw.min_bid_price ?? 0) * 1.1)
  const appraisalPrice = raw.appraisal_price ?? 0
  if (!estimatedBid || !appraisalPrice) return 0
  const roi = (appraisalPrice - estimatedBid) / estimatedBid * 100
  return parseFloat(Math.max(-99, Math.min(999, roi)).toFixed(2))
}

function calcScore(roi, judgment, failedAuctions) {
  let base = Math.min(85, Math.max(30, 55 + roi * 0.3))
  if (judgment === 'PASS') base += 10
  if (judgment === 'FAIL') base -= 30
  if (failedAuctions >= 5) base -= 5
  if (failedAuctions >= 8) base -= 5
  return Math.round(Math.max(0, Math.min(100, base)))
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

function buildSummary(raw) {
  const failCount = parseInt(String(raw.failed_auctions ?? '0'), 10)
  const ratio = raw.bid_ratio_pct ? `감정가 대비 ${raw.bid_ratio_pct}%` : ''
  const failNote = failCount > 0 ? ` 유찰 ${failCount}회.` : ''
  const notes = raw.special_notes ? ` ${raw.special_notes}` : ''
  return `${raw.court ?? ''}. ${ratio}${failNote}${notes}`.trim()
}

function transform(raw) {
  const roi = calcRoi(raw)
  const judgment = inferLegalJudgment(raw.special_notes, raw.failed_auctions)
  const failedAuctions = parseInt(String(raw.failed_auctions ?? '0'), 10)
  const estimatedBid = raw.estimated_bid ?? Math.round((raw.min_bid_price ?? 0) * 1.1)

  return {
    id: raw.case_id,
    case_number: raw.case_id,
    court: raw.court ?? '',
    region: extractRegion(raw.address ?? ''),
    district: extractDistrict(raw.address ?? ''),
    address: raw.address ?? '',
    property_type: raw.property_type ?? '기타',
    area: 0,
    minimum_bid: raw.min_bid_price ?? 0,
    estimated_value: raw.appraisal_price ?? 0,
    appraisal_price: raw.appraisal_price ?? 0,
    estimated_bid: estimatedBid,
    roi,
    legal_judgment: judgment,
    risk_level: judgment === 'FAIL' ? 'high' : judgment === 'CAUTION' ? 'medium' : roi < 0 ? 'medium' : 'low',
    auction_date: raw.auction_date || null,
    status: '예정',
    score: calcScore(roi, judgment, failedAuctions),
    summary: buildSummary(raw),
    tags: buildTags(raw, judgment),
    report_file: `${raw.case_id}.json`,
    failed_auctions: failedAuctions,
    special_notes: raw.special_notes ?? '',
    nearby_trade: raw.nearby_trade ?? null,
    lat: null,
    lng: null,
  }
}

// ─── 메인 ────────────────────────────────────────

async function main() {
  if (!existsSync(INPUT_PATH)) {
    console.error(`❌ 파이프라인 데이터 없음: ${INPUT_PATH}`)
    process.exit(1)
  }

  const raw = JSON.parse(await readFile(INPUT_PATH, 'utf-8'))
  const records = Array.isArray(raw) ? raw : (raw.properties ?? [])

  // 중복 제거
  const seen = new Set()
  const unique = records.filter((r) => {
    if (seen.has(r.case_id)) return false
    seen.add(r.case_id)
    return true
  })

  console.log(`📦 ${unique.length}개 매물 변환 중...`)
  const properties = unique.map(transform)

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  })

  // 배치 upsert (25개씩)
  const BATCH = 25
  let inserted = 0
  let errors = 0

  for (let i = 0; i < properties.length; i += BATCH) {
    const batch = properties.slice(i, i + BATCH)
    const { error } = await supabase
      .from('properties')
      .upsert(batch, { onConflict: 'id' })

    if (error) {
      console.error(`❌ 배치 ${i}~${i + batch.length} 오류:`, error.message)
      errors += batch.length
    } else {
      inserted += batch.length
      console.log(`  ✅ ${inserted}/${properties.length} 업로드 완료`)
    }
  }

  const passCount = properties.filter((p) => p.legal_judgment === 'PASS').length
  const cautionCount = properties.filter((p) => p.legal_judgment === 'CAUTION').length
  const failCount = properties.filter((p) => p.legal_judgment === 'FAIL').length

  console.log('')
  console.log(`🎉 시드 완료: ${inserted}개 업로드, ${errors}개 오류`)
  console.log(`  PASS: ${passCount} | CAUTION: ${cautionCount} | FAIL: ${failCount}`)
}

main().catch((err) => {
  console.error('❌ 오류:', err)
  process.exit(1)
})
