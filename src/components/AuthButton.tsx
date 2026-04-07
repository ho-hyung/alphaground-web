'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import type { User } from '@supabase/supabase-js'

interface Props {
  user: User | null
}

export function AuthButton({ user }: Props) {
  const router = useRouter()
  const supabase = createClient()

  async function signOut() {
    await supabase.auth.signOut()
    router.refresh()
  }

  if (user) {
    return (
      <div className="flex items-center gap-2">
        <span className="hidden sm:inline text-xs text-slate-400 max-w-[120px] truncate">
          {user.email}
        </span>
        <a
          href="/mypage"
          className="text-xs text-slate-400 hover:text-slate-200 border border-slate-700 rounded-md px-2.5 py-1 transition-colors"
        >
          마이페이지
        </a>
        <button
          onClick={signOut}
          className="text-xs text-slate-400 hover:text-slate-200 border border-slate-700 rounded-md px-2.5 py-1 transition-colors"
        >
          로그아웃
        </button>
      </div>
    )
  }

  return (
    <a
      href="/login"
      className="text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded-md px-3 py-1.5 transition-colors"
    >
      구글 로그인
    </a>
  )
}
