'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

interface Props {
  redirectTo?: string
  onClose: () => void
}

export function LoginPromptModal({ redirectTo, onClose }: Props) {
  const router = useRouter()

  function handleLogin() {
    const next = redirectTo ? `?next=${encodeURIComponent(redirectTo)}` : ''
    router.push(`/login${next}`)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-slate-800 border border-slate-700 rounded-2xl p-6 w-full max-w-sm"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-center mb-5">
          <div className="text-3xl mb-3">🔐</div>
          <h2 className="text-lg font-bold text-white mb-2">로그인이 필요합니다</h2>
          <p className="text-sm text-slate-400">
            상세 분석 리포트는 회원에게만 제공됩니다.
            <br />
            무료로 가입하고 주당 3건 열람하세요.
          </p>
        </div>

        <div className="space-y-2">
          <Button
            onClick={handleLogin}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold"
          >
            로그인 / 회원가입
          </Button>
          <button
            onClick={onClose}
            className="w-full text-sm text-slate-500 hover:text-slate-300 py-2 transition-colors"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  )
}
