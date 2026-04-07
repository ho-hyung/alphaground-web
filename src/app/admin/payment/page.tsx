import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { PaymentTestClient } from './PaymentTestClient'

async function getPayments() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!
  const supabase = createAdminClient(url, key)

  const { data } = await supabase
    .from('payment_links')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50)

  return data ?? []
}

export default async function AdminPaymentPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login?next=/admin/payment')
  }

  const adminEmail = process.env.ADMIN_EMAIL
  if (adminEmail && user.email !== adminEmail) {
    redirect('/?error=forbidden')
  }

  const payments = await getPayments()
  const defaultPrice = parseInt(process.env.PORTONE_MEMBERSHIP_PRICE ?? '49000', 10)

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">결제 테스트 & 현황</h1>
          <p className="text-sm text-slate-400 mt-1">포트원 v2 결제 연동 테스트 페이지</p>
        </div>
        <span className="text-xs text-slate-500 bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5">
          관리자: {user.email}
        </span>
      </div>

      <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl px-4 py-3 text-sm text-indigo-300 space-y-1">
        <p className="font-medium">테스트 순서</p>
        <ol className="list-decimal list-inside space-y-0.5 text-indigo-200/80">
          <li>이메일 입력 후 <strong>링크 생성</strong> 클릭</li>
          <li>생성된 링크 클릭 → 포트원 결제창에서 테스트 카드로 결제</li>
          <li>Webhook 자동 수신 → 상태가 <strong>결제완료</strong>로 변경 확인</li>
          <li>해당 이메일 계정의 멤버십이 <code className="bg-slate-800 rounded px-1">premium</code>으로 변경됐는지 Supabase에서 확인</li>
        </ol>
      </div>

      <PaymentTestClient initialPayments={payments} defaultPrice={defaultPrice} />
    </div>
  )
}
