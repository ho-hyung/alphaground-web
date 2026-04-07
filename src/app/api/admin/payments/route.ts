/**
 * GET /api/admin/payments
 *
 * 관리자용: 전체 결제 목록 조회 엔드포인트.
 *
 * 쿼리 파라미터:
 *   status  — 필터: pending | paid | failed | expired | cancelled (기본: 전체)
 *   page    — 페이지 번호 (기본: 1)
 *   limit   — 페이지 크기 (기본: 50, 최대: 100)
 *
 * 환경변수:
 *   CRON_SECRET              — 내부 API 인증
 *   SUPABASE_SERVICE_ROLE_KEY
 *   NEXT_PUBLIC_SUPABASE_URL
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) throw new Error('Supabase 환경변수가 설정되지 않았습니다.')
  return createClient(url, serviceKey)
}

const VALID_STATUSES = ['pending', 'paid', 'failed', 'expired', 'cancelled'] as const
type PaymentStatus = (typeof VALID_STATUSES)[number]

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = request.nextUrl
  const statusParam = searchParams.get('status')
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '50', 10)))
  const offset = (page - 1) * limit

  const supabase = createAdminClient()

  let query = supabase
    .from('payment_links')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (statusParam && VALID_STATUSES.includes(statusParam as PaymentStatus)) {
    query = query.eq('status', statusParam)
  }

  const { data, error, count } = await query

  if (error) {
    console.error('결제 목록 조회 오류:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }

  // 요약 통계
  const { data: stats } = await supabase.from('payment_links').select('status, amount')

  const summary = {
    totalRevenue: stats?.filter((r) => r.status === 'paid').reduce((sum, r) => sum + r.amount, 0) ?? 0,
    totalPaid: stats?.filter((r) => r.status === 'paid').length ?? 0,
    totalPending: stats?.filter((r) => r.status === 'pending').length ?? 0,
    totalFailed: stats?.filter((r) => r.status === 'failed').length ?? 0,
  }

  return NextResponse.json({
    success: true,
    payments: data,
    pagination: {
      page,
      limit,
      total: count ?? 0,
      totalPages: Math.ceil((count ?? 0) / limit),
    },
    summary,
  })
}
