'use client'

import { useState, useTransition } from 'react'
import { createTestPaymentLink } from './actions'

interface PaymentLink {
  id: string
  payment_link_id: string
  payment_link_url: string
  customer_email: string
  amount: number
  status: string
  expires_at: string
  paid_at: string | null
  created_at: string
}

interface Props {
  initialPayments: PaymentLink[]
  defaultPrice: number
}

const STATUS_BADGE: Record<string, string> = {
  pending: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  paid: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  failed: 'bg-red-500/20 text-red-300 border-red-500/30',
  expired: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
  cancelled: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
}

const STATUS_LABEL: Record<string, string> = {
  pending: '대기',
  paid: '결제완료',
  failed: '실패',
  expired: '만료',
  cancelled: '취소',
}

export function PaymentTestClient({ initialPayments, defaultPrice }: Props) {
  const [payments, setPayments] = useState<PaymentLink[]>(initialPayments)
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(formData: FormData) {
    setError(null)
    setGeneratedUrl(null)

    startTransition(async () => {
      try {
        const result = await createTestPaymentLink(formData)
        setGeneratedUrl(result.paymentLinkUrl)
        // Refresh list
        const res = await fetch('/admin/payment?refresh=1')
        if (res.ok) {
          const json = await res.json().catch(() => null)
          if (json?.payments) setPayments(json.payments)
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : '결제 링크 생성 실패')
      }
    })
  }

  return (
    <div className="space-y-8">
      {/* 결제 링크 생성 폼 */}
      <section className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">테스트 결제 링크 생성</h2>
        <form action={handleSubmit} className="flex flex-col sm:flex-row gap-3">
          <input
            name="email"
            type="email"
            required
            placeholder="테스트 이메일"
            className="flex-1 bg-slate-900 border border-slate-600 rounded-lg px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <input
            name="amountKRW"
            type="number"
            required
            defaultValue={defaultPrice}
            min={1}
            className="w-32 bg-slate-900 border border-slate-600 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            type="submit"
            disabled={isPending}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {isPending ? '생성 중…' : '링크 생성'}
          </button>
        </form>

        {error && (
          <p className="mt-3 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2">
            {error}
          </p>
        )}

        {generatedUrl && (
          <div className="mt-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-4 space-y-2">
            <p className="text-sm font-medium text-emerald-400">결제 링크 생성 완료!</p>
            <a
              href={generatedUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block text-sm text-indigo-400 hover:text-indigo-300 underline underline-offset-2 break-all"
            >
              {generatedUrl}
            </a>
            <p className="text-xs text-slate-400">
              포트원 테스트 카드: <code className="text-slate-300">4242 4242 4242 4242</code> / 만료: 임의 미래 날짜 / CVC: 임의 3자리
            </p>
          </div>
        )}
      </section>

      {/* 결제 목록 */}
      <section>
        <h2 className="text-lg font-semibold text-white mb-4">
          결제 현황
          <span className="ml-2 text-sm font-normal text-slate-400">({payments.length}건)</span>
        </h2>
        {payments.length === 0 ? (
          <p className="text-slate-400 text-sm">결제 내역이 없습니다.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-700/50">
            <table className="w-full text-sm">
              <thead className="bg-slate-800/80 text-slate-400 text-xs uppercase tracking-wide">
                <tr>
                  <th className="px-4 py-3 text-left">이메일</th>
                  <th className="px-4 py-3 text-right">금액</th>
                  <th className="px-4 py-3 text-center">상태</th>
                  <th className="px-4 py-3 text-left">링크</th>
                  <th className="px-4 py-3 text-left">생성일</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {payments.map((p) => (
                  <tr key={p.id} className="bg-slate-900/40 hover:bg-slate-800/40 transition-colors">
                    <td className="px-4 py-3 text-slate-200">{p.customer_email}</td>
                    <td className="px-4 py-3 text-right text-slate-200">
                      {p.amount.toLocaleString()}원
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-xs border ${STATUS_BADGE[p.status] ?? STATUS_BADGE.pending}`}
                      >
                        {STATUS_LABEL[p.status] ?? p.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <a
                        href={p.payment_link_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-indigo-400 hover:text-indigo-300 underline underline-offset-2 text-xs"
                      >
                        결제하기 →
                      </a>
                    </td>
                    <td className="px-4 py-3 text-slate-400 text-xs">
                      {new Date(p.created_at).toLocaleString('ko-KR')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
