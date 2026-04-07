import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST /api/recently-viewed — 최근 본 매물 기록
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ success: false })
  }

  const { caseNumber } = await request.json() as { caseNumber: string }
  if (!caseNumber) {
    return NextResponse.json({ error: 'caseNumber is required' }, { status: 400 })
  }

  // upsert: 이미 있으면 viewed_at 갱신
  const { error } = await supabase.from('recently_viewed').upsert(
    { user_id: user.id, case_number: caseNumber, viewed_at: new Date().toISOString() },
    { onConflict: 'user_id,case_number' }
  )

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // 50개 초과 시 오래된 것 삭제
  const { data: rows } = await supabase
    .from('recently_viewed')
    .select('id, viewed_at')
    .eq('user_id', user.id)
    .order('viewed_at', { ascending: true })

  if (rows && rows.length > 50) {
    const toDelete = rows.slice(0, rows.length - 50).map((r) => r.id)
    await supabase.from('recently_viewed').delete().in('id', toDelete)
  }

  return NextResponse.json({ success: true })
}
