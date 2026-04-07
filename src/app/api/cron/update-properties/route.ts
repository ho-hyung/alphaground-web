/**
 * GET /api/cron/update-properties
 *
 * Vercel Cron Job이 주기적으로 호출하는 엔드포인트.
 * pipeline/alpha_report.json 또는 PIPELINE_DATA_URL 환경변수에서
 * 최신 매물 데이터를 읽어 Supabase properties 테이블에 upsert합니다.
 *
 * 환경변수:
 *   CRON_SECRET                  — Vercel이 자동 주입 (vercel.json cron 설정 시)
 *   SUPABASE_SERVICE_ROLE_KEY    — Supabase 서비스 롤 키
 *   NEXT_PUBLIC_SUPABASE_URL     — Supabase 프로젝트 URL
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// ─── 변환 헬퍼 ───────────────────────────────────────

function extractRegion(address: string) {
  if (address.startsWith('서울')) return '서울'
  if (address.startsWith('경기')) return '경기'
  if (address.startsWith('인천')) return '인천'
  return '기타'
}

function extractDistrict(address: string) {
  const parts = address.split(' ')
  for (const part of parts) {
    if (part.endsWith('구') || part.endsWith('시') || part.endsWith('군')) return part
  }
  return parts[1] ?? ''
}

const FAIL_KW = ['유치권', '유치권신고', '미납공사대금', '법정지상권', '점유자불명']
const CAUTION_KW = ['임차인', '선순위', '관리비', '가처분', '가등기']

function inferJudgment(notes: string, fails: number) {
  if (FAIL_KW.some((kw) => notes.includes(kw))) return 'FAIL'
  if (CAUTION_KW.some((kw) => notes.includes(kw))) return 'CAUTION'
  if (fails >= 5) return 'CAUTION'
  return 'PASS'
}

function calcRoi(raw: Record<string, unknown>) {
  const bid = (raw.estimated_bid as number) ?? Math.round(((raw.min_bid_price as number) ?? 0) * 1.1)
  const appraisal = (raw.appraisal_price as number) ?? 0
  if (!bid || !appraisal) return 0
  return parseFloat(Math.max(-99, Math.min(999, (appraisal - bid) / bid * 100)).toFixed(2))
}

function calcScore(roi: number, judgment: string, fails: number) {
  let base = Math.min(85, Math.max(30, 55 + roi * 0.3))
  if (judgment === 'PASS') base += 10
  if (judgment === 'FAIL') base -= 30
  if (fails >= 5) base -= 5
  if (fails >= 8) base -= 5
  return Math.round(Math.max(0, Math.min(100, base)))
}

function transform(raw: Record<string, unknown>) {
  const roi = calcRoi(raw)
  const notes = String(raw.special_notes ?? '')
  const fails = parseInt(String(raw.failed_auctions ?? '0'), 10)
  const judgment = inferJudgment(notes, fails)
  const estimatedBid = (raw.estimated_bid as number) ?? Math.round(((raw.min_bid_price as number) ?? 0) * 1.1)

  return {
    id: String(raw.case_id),
    case_number: String(raw.case_id),
    court: String(raw.court ?? ''),
    region: extractRegion(String(raw.address ?? '')),
    district: extractDistrict(String(raw.address ?? '')),
    address: String(raw.address ?? ''),
    property_type: String(raw.property_type ?? '기타'),
    area: 0,
    minimum_bid: (raw.min_bid_price as number) ?? 0,
    estimated_value: (raw.appraisal_price as number) ?? 0,
    appraisal_price: (raw.appraisal_price as number) ?? 0,
    estimated_bid: estimatedBid,
    roi,
    legal_judgment: judgment,
    risk_level: judgment === 'FAIL' ? 'high' : judgment === 'CAUTION' ? 'medium' : roi < 0 ? 'medium' : 'low',
    auction_date: (raw.auction_date as string) || null,
    status: '예정',
    score: calcScore(roi, judgment, fails),
    summary: `${raw.court ?? ''}. 감정가 대비 ${raw.bid_ratio_pct ?? 100}%${fails > 0 ? ` 유찰 ${fails}회.` : ''}${notes ? ` ${notes}` : ''}`.trim(),
    tags: [
      fails >= 5 ? '다회유찰' : null,
      (raw.bid_ratio_pct as number) < 50 ? '대폭할인' : null,
      judgment === 'PASS' ? '권리안정' : null,
      judgment === 'CAUTION' ? '주의필요' : null,
    ].filter(Boolean) as string[],
    report_file: `${raw.case_id}.json`,
    failed_auctions: fails,
    special_notes: notes,
    nearby_trade: (raw.nearby_trade as object) ?? null,
    lat: null,
    lng: null,
  }
}

// ─── 핸들러 ──────────────────────────────────────────

export async function GET(request: NextRequest) {
  // Vercel Cron 인증 (CRON_SECRET 환경변수 자동 주입)
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: 'Supabase env vars missing' }, { status: 500 })
  }

  // 파이프라인 데이터 가져오기 — URL 환경변수 우선, 없으면 public 정적 파일
  let records: Record<string, unknown>[] = []
  const pipelineUrl = process.env.PIPELINE_DATA_URL
  if (pipelineUrl) {
    const res = await fetch(pipelineUrl)
    records = await res.json()
  } else {
    // public/data/properties.json 폴백 (이미 변환된 데이터)
    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'http://localhost:3000'
    const res = await fetch(`${baseUrl}/data/properties.json`)
    if (res.ok) {
      records = await res.json()
    }
  }

  if (records.length === 0) {
    return NextResponse.json({ message: '데이터 없음 — 업데이트 스킵', upserted: 0 })
  }

  // 중복 제거
  const seen = new Set<string>()
  const unique = records.filter((r) => {
    const key = String(r.case_id ?? r.id)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  const properties = unique.map(transform)

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const BATCH = 25
  let upserted = 0
  for (let i = 0; i < properties.length; i += BATCH) {
    const { error } = await supabase
      .from('properties')
      .upsert(properties.slice(i, i + BATCH), { onConflict: 'id' })
    if (!error) upserted += Math.min(BATCH, properties.length - i)
  }

  return NextResponse.json({
    message: '업데이트 완료',
    upserted,
    total: properties.length,
    timestamp: new Date().toISOString(),
  })
}
