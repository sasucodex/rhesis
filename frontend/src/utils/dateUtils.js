export function getAbsoluteLong(dateString) {
  if (!dateString) return ''
  const d = new Date(dateString + 'Z')
  const timeStr = d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
  return `${d.toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })}, ${timeStr}`
}

export function getRelativeSidebar(dateString) {
  if (!dateString) return ''
  const d = new Date(dateString + 'Z')
  const now = new Date()
  
  const dDate = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const nowDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const diffDays = Math.floor((nowDate - dDate) / (1000 * 60 * 60 * 24))
  
  const diffSec = Math.floor((now - d) / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHour = Math.floor(diffMin / 60)

  if (diffDays === 0) {
    if (diffSec < 60) return "adesso"
    if (diffMin < 60) return `${diffMin}m fa`
    return `${diffHour}h fa`
  }
  if (diffDays === 1) return "ieri"
  if (diffDays >= 2 && diffDays <= 6) return `${diffDays}g fa`
  
  return d.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' }).replace(/\./g, '')
}

export function getRelativeMain(dateString) {
  if (!dateString) return ''
  const d = new Date(dateString + 'Z')
  const now = new Date()
  
  const dDate = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const nowDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const diffDays = Math.floor((nowDate - dDate) / (1000 * 60 * 60 * 24))
  
  const diffSec = Math.floor((now - d) / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHour = Math.floor(diffMin / 60)
  
  const timeStr = d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })

  if (diffDays === 0) {
    if (diffSec < 60) return "adesso"
    if (diffMin < 60) return diffMin === 1 ? "un minuto fa" : `${diffMin} minuti fa`
    return diffHour === 1 ? "un'ora fa" : `${diffHour} ore fa`
  }
  if (diffDays === 1) return `ieri alle ${timeStr}`
  if (diffDays >= 2 && diffDays <= 6) return `${diffDays} giorni fa alle ${timeStr}`
  
  return getAbsoluteLong(dateString)
}
