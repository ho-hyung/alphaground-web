import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

async function getUserData(userId: string) {
  const supabase = await createClient()

  const [bookmarksResult, recentlyViewedResult] = await Promise.all([
    supabase
      .from('bookmarks')
      .select('case_number, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false }),
    supabase
      .from('recently_viewed')
      .select('case_number, viewed_at')
      .eq('user_id', userId)
      .order('viewed_at', { ascending: false })
      .limit(20),
  ])

  return {
    bookmarks: bookmarksResult.data ?? [],
    recentlyViewed: recentlyViewedResult.data ?? [],
  }
}

function formatRelativeTime(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 60) return `${minutes}분 전`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}시간 전`
  const days = Math.floor(hours / 24)
  return `${days}일 전`
}

export default async function MyPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login?next=/mypage')
  }

  const { bookmarks, recentlyViewed } = await getUserData(user.id)

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white mb-1">마이페이지</h1>
        <p className="text-sm text-slate-400">{user.email}</p>
      </div>

      {/* 찜한 매물 */}
      <section className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-6 space-y-4">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <span className="text-pink-400">♥</span> 찜한 매물
          <span className="text-xs font-normal text-slate-500 ml-auto">{bookmarks.length}건</span>
        </h2>

        {bookmarks.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-6">
            아직 찜한 매물이 없습니다.{' '}
            <Link href="/" className="text-indigo-400 hover:text-indigo-300">
              매물 목록
            </Link>
            에서 관심 매물을 저장해 보세요.
          </p>
        ) : (
          <ul className="space-y-2">
            {bookmarks.map((b) => (
              <li key={b.case_number} className="flex items-center justify-between">
                <Link
                  href={`/properties/${encodeURIComponent(b.case_number)}`}
                  className="font-mono text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                  {b.case_number}
                </Link>
                <span className="text-xs text-slate-500">{formatRelativeTime(b.created_at)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* 최근 본 매물 */}
      <section className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-6 space-y-4">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <span className="text-slate-400">🕐</span> 최근 본 매물
          <span className="text-xs font-normal text-slate-500 ml-auto">{recentlyViewed.length}건</span>
        </h2>

        {recentlyViewed.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-6">
            최근에 본 매물이 없습니다.{' '}
            <Link href="/" className="text-indigo-400 hover:text-indigo-300">
              매물 목록
            </Link>
            을 둘러보세요.
          </p>
        ) : (
          <ul className="space-y-2">
            {recentlyViewed.map((r) => (
              <li key={r.case_number} className="flex items-center justify-between">
                <Link
                  href={`/properties/${encodeURIComponent(r.case_number)}`}
                  className="font-mono text-sm text-slate-300 hover:text-white transition-colors"
                >
                  {r.case_number}
                </Link>
                <span className="text-xs text-slate-500">{formatRelativeTime(r.viewed_at)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
