import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST /api/bookmarks — 찜하기 추가
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { caseNumber } = await request.json() as { caseNumber: string }
  if (!caseNumber) {
    return NextResponse.json({ error: 'caseNumber is required' }, { status: 400 })
  }

  const { error } = await supabase.from('bookmarks').upsert(
    { user_id: user.id, case_number: caseNumber },
    { onConflict: 'user_id,case_number', ignoreDuplicates: true }
  )

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

// DELETE /api/bookmarks — 찜하기 취소
export async function DELETE(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const caseNumber = searchParams.get('caseNumber')
  if (!caseNumber) {
    return NextResponse.json({ error: 'caseNumber is required' }, { status: 400 })
  }

  const { error } = await supabase
    .from('bookmarks')
    .delete()
    .eq('user_id', user.id)
    .eq('case_number', caseNumber)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

// GET /api/bookmarks?caseNumber=xxx — 찜 여부 확인
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ bookmarked: false })
  }

  const { searchParams } = new URL(request.url)
  const caseNumber = searchParams.get('caseNumber')
  if (!caseNumber) {
    return NextResponse.json({ error: 'caseNumber is required' }, { status: 400 })
  }

  const { data } = await supabase
    .from('bookmarks')
    .select('id')
    .eq('user_id', user.id)
    .eq('case_number', caseNumber)
    .maybeSingle()

  return NextResponse.json({ bookmarked: !!data })
}
