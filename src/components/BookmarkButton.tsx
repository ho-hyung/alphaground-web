'use client'

import { useState, useEffect, useCallback } from 'react'

interface Props {
  caseNumber: string
  isLoggedIn: boolean
}

export function BookmarkButton({ caseNumber, isLoggedIn }: Props) {
  const [bookmarked, setBookmarked] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!isLoggedIn) return
    fetch(`/api/bookmarks?caseNumber=${encodeURIComponent(caseNumber)}`)
      .then((r) => r.json())
      .then((d) => setBookmarked(d.bookmarked ?? false))
      .catch(() => {})
  }, [caseNumber, isLoggedIn])

  const toggle = useCallback(async () => {
    if (!isLoggedIn) {
      window.location.href = `/login?next=${encodeURIComponent(window.location.pathname)}`
      return
    }
    setLoading(true)
    try {
      if (bookmarked) {
        await fetch(`/api/bookmarks?caseNumber=${encodeURIComponent(caseNumber)}`, { method: 'DELETE' })
        setBookmarked(false)
      } else {
        await fetch('/api/bookmarks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ caseNumber }),
        })
        setBookmarked(true)
      }
    } finally {
      setLoading(false)
    }
  }, [bookmarked, caseNumber, isLoggedIn])

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={`flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg border transition-colors ${
        bookmarked
          ? 'bg-pink-500/20 border-pink-500/40 text-pink-400 hover:bg-pink-500/30'
          : 'bg-slate-700/30 border-slate-600/40 text-slate-400 hover:text-pink-400 hover:border-pink-500/40'
      }`}
      title={bookmarked ? '찜 취소' : '찜하기'}
    >
      <span className="text-base leading-none">{bookmarked ? '♥' : '♡'}</span>
      <span>{bookmarked ? '찜 완료' : '찜하기'}</span>
    </button>
  )
}
