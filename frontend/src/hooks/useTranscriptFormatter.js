import { useMemo, useEffect, useRef, useCallback } from 'react'
import { parseTimestampToSeconds } from '../utils/audioUtils'

export function useTranscriptFormatter({
  transcript,
  activeSearchQuery,
  currentRecordId,
  onSeek,
  containerRef,
}) {
  const internalRef = useRef(null)
  const targetRef = containerRef || internalRef

  const formattedTranscript = useMemo(() => {
    if (!transcript) return ''
    let html = transcript
      .replace(/<h2>\s*<\/h2>\s*<p>(\s*\[\d{1,2}:\d{2}(?::\d{2})?\].*?)<\/p>/gi, '<h2>$1</h2>')
      .replace(/<p>\s*(\[\d{1,2}:\d{2}(?::\d{2})?\])\s*##\s*(.*?)<\/p>/gi, '<h2>$2</h2>')
      .replace(/<p>\s*##\s*(\[\d{1,2}:\d{2}(?::\d{2})?\]\s*.*?)<\/p>/gi, '<h2>$1</h2>')
      .replace(/<p>\s*##\s*(.*?)<\/p>/gi, '<h2>$1</h2>')
      .replace(/<h2>\s*<\/h2>\s*/gi, '')

    html = html.replace(
      /(<h2>([\s\S]*?)<\/h2>)(\s*)(<p[^>]*>)([\s\S]*?)(?=<\/p>|$)/gi,
      (match, h2Full, h2Inner, sep, pOpen, pInner) => {
        const tsMatch = h2Inner.match(/\[\d{1,2}:\d{2}(?::\d{2})?\]/)
        if (!tsMatch) return match
        const ts = tsMatch[0]
        const cleanH2Inner = h2Inner.replace(/\[\d{1,2}:\d{2}(?::\d{2})?\]\s*/g, '').trim()
        const cleanH2 = `<h2>${cleanH2Inner}</h2>`
        if (/^\s*\[\d{1,2}:\d{2}(?::\d{2})?\]/.test(pInner)) {
          return `${cleanH2}${sep}${pOpen}${pInner}`
        }
        return `${cleanH2}${sep}${pOpen}${ts} ${pInner.trimStart()}`
      }
    )

    html = html.replace(/<h2>([\s\S]*?)<\/h2>/gi, (match, inner) => {
      const cleanInner = inner.replace(/\[\d{1,2}:\d{2}(?::\d{2})?\]\s*/g, '').trim()
      return `<h2>${cleanInner}</h2>`
    })

    html = html
      .replace(/\[(\d{1,2}:\d{2}(?::\d{2})?)\]\s*##\s*/g, '[$1] ')
      .replace(
        /\[(\d{1,2}:\d{2}(?::\d{2})?)\]/g,
        '<button type="button" data-timestamp="$1" class="timestamp-badge inline-flex items-center gap-1 font-mono text-xs px-2 py-0.5 my-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700 font-medium select-none align-middle transition-colors cursor-pointer" title="Salta al timestamp $1">▶ $1</button>'
      )

    if (activeSearchQuery && activeSearchQuery.trim()) {
      const escaped = activeSearchQuery.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const regex = new RegExp(`(?![^<]*>)(${escaped})`, 'gi')
      html = html.replace(
        regex,
        '<mark class="search-highlight bg-amber-200 dark:bg-amber-900/60 dark:text-amber-200 text-zinc-900 rounded-xs px-0.5 font-medium">$1</mark>'
      )
    }

    return html
  }, [transcript, activeSearchQuery])

  useEffect(() => {
    if (activeSearchQuery && currentRecordId) {
      const timer = setTimeout(() => {
        const firstMatch = targetRef.current?.querySelector('.search-highlight')
        if (firstMatch) {
          firstMatch.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [activeSearchQuery, currentRecordId, formattedTranscript, targetRef])

  const handleTimestampClick = useCallback(
    (e) => {
      const badge = e.target.closest('[data-timestamp]')
      if (badge) {
        const timeStr = badge.getAttribute('data-timestamp')
        const seconds = parseTimestampToSeconds(timeStr)
        if (seconds !== null) {
          onSeek?.(seconds)
        }
      }
    },
    [onSeek]
  )

  return {
    formattedTranscript,
    transcriptContainerRef: targetRef,
    handleTimestampClick,
  }
}
