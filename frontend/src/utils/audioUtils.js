export function formatTime(seconds, forceHours = false) {
  if (isNaN(seconds) || seconds < 0) {
    return forceHours ? '00:00:00' : '00:00'
  }
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  const pad = (n) => String(n).padStart(2, '0')
  if (forceHours || h > 0) {
    return `${pad(h)}:${pad(m)}:${pad(s)}`
  }
  return `${pad(m)}:${pad(s)}`
}

export function parseTimestampToSeconds(timeStr) {
  if (!timeStr) return null
  const cleaned = timeStr.replace(/[[\]]/g, '').trim()
  const parts = cleaned.split(':').map(Number)
  if (parts.some(isNaN)) return null
  if (parts.length === 2) {
    return parts[0] * 60 + parts[1]
  }
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2]
  }
  return null
}
