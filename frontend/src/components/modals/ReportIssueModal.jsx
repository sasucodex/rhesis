import { useState, useEffect } from 'react'
import { AlertTriangle, Mail, Copy, Check, X, Terminal, ChevronDown } from 'lucide-react'

const ISSUE_CATEGORIES = [
  'Errore durante la trascrizione',
  'Problema con il codice di accesso Google',
  'Problema con audio/player',
  'Altro'
]

const DEVELOPER_EMAIL = 'samuele.gallo@community.unipa.it'
const APP_VERSION = 'v1.0.0'

function getSystemPlatform() {
  if (typeof navigator === 'undefined') return 'Desktop'
  const platform = navigator.userAgentData?.platform || navigator.platform || 'Desktop'
  const userAgent = navigator.userAgent || ''
  if (/linux/i.test(userAgent)) return 'Linux'
  if (/macintosh|mac os x/i.test(userAgent)) return 'macOS'
  if (/windows|win32/i.test(userAgent)) return 'Windows'
  return platform
}

export default function ReportIssueModal({ isOpen, onClose, lastError }) {
  const [selectedCategory, setSelectedCategory] = useState(ISSUE_CATEGORIES[0])
  const [description, setDescription] = useState('')
  const [copiedReport, setCopiedReport] = useState(false)
  const [copiedEmail, setCopiedEmail] = useState(false)
  const [showSendMenu, setShowSendMenu] = useState(false)
  const [mailtoNotice, setMailtoNotice] = useState(false)
  const [systemPlatform] = useState(getSystemPlatform)

  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const getDiagnosticText = (currentDateStr) => {
    return [
      `Versione App: ${APP_VERSION}`,
      `Sistema Operativo: ${systemPlatform || 'Desktop'}`,
      `Data e Ora: ${currentDateStr}`,
      `Ultimo Errore: ${lastError ? String(lastError) : 'Nessun errore registrato'}`
    ].join('\n')
  }

  const buildReportPayload = () => {
    const dateStr = new Date().toLocaleString('it-IT')
    const subject = `[Rhesis ${APP_VERSION}] Segnalazione: ${selectedCategory}`
    const body = [
      `Categoria: ${selectedCategory}`,
      '',
      'Descrizione del problema:',
      description.trim() ? description.trim() : '(Nessuna descrizione inserita)',
      '',
      '--- Informazioni Diagnostiche ---',
      getDiagnosticText(dateStr)
    ].join('\n')

    return { subject, body }
  }

  const handleCopyReport = async () => {
    const dateStr = new Date().toLocaleString('it-IT')
    const reportText = [
      '=== SEGNALAZIONE PROBLEMA RHESIS ===',
      `Categoria: ${selectedCategory}`,
      '',
      'Descrizione del problema:',
      description.trim() ? description.trim() : '(Nessuna descrizione inserita)',
      '',
      '--- Informazioni Diagnostiche ---',
      getDiagnosticText(dateStr)
    ].join('\n')

    try {
      await navigator.clipboard.writeText(reportText)
      setCopiedReport(true)
      setTimeout(() => setCopiedReport(false), 2500)
    } catch {
      const textArea = document.createElement('textarea')
      textArea.value = reportText
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      setCopiedReport(true)
      setTimeout(() => setCopiedReport(false), 2500)
    }
  }

  const handleCopyEmail = async () => {
    try {
      await navigator.clipboard.writeText(DEVELOPER_EMAIL)
      setCopiedEmail(true)
      setTimeout(() => setCopiedEmail(false), 2500)
    } catch {
      const textArea = document.createElement('textarea')
      textArea.value = DEVELOPER_EMAIL
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      setCopiedEmail(true)
      setTimeout(() => setCopiedEmail(false), 2500)
    }
  }

  const handleSendGmail = () => {
    setShowSendMenu(false)
    const { subject, body } = buildReportPayload()
    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(DEVELOPER_EMAIL)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
    window.open(gmailUrl, '_blank', 'noopener,noreferrer')
  }

  const handleSendOutlook = () => {
    setShowSendMenu(false)
    const { subject, body } = buildReportPayload()
    const outlookUrl = `https://outlook.live.com/mail/0/deeplink/compose?to=${encodeURIComponent(DEVELOPER_EMAIL)}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
    window.open(outlookUrl, '_blank', 'noopener,noreferrer')
  }

  const handleSendMailto = () => {
    setShowSendMenu(false)
    setMailtoNotice(true)
    const { subject, body } = buildReportPayload()
    const mailtoUrl = `mailto:${DEVELOPER_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
    window.location.href = mailtoUrl
  }

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl max-w-xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-900 dark:text-zinc-100">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-zinc-900 dark:text-white">
                Segnala un Problema
              </h3>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-zinc-500 dark:text-zinc-400">Invia a:</span>
                <span className="text-xs font-mono text-zinc-800 dark:text-zinc-200 font-medium">
                  {DEVELOPER_EMAIL}
                </span>
                <button
                  type="button"
                  onClick={handleCopyEmail}
                  className="p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md transition-colors inline-flex items-center gap-1 text-[11px]"
                  title="Copia email sviluppatore"
                >
                  {copiedEmail ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                      <span className="text-emerald-600 dark:text-emerald-400 font-medium">Copiata</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copia</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors"
            title="Chiudi"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6 text-sm text-zinc-700 dark:text-zinc-300 custom-scrollbar flex-1">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-2">
              Seleziona Categoria
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {ISSUE_CATEGORIES.map((cat) => {
                const isSelected = selectedCategory === cat
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-2.5 rounded-xl text-xs font-medium text-left border transition-colors flex items-center justify-between ${
                      isSelected
                        ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 border-zinc-900 dark:border-white shadow-sm'
                        : 'bg-zinc-50 dark:bg-zinc-950 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                    }`}
                  >
                    <span>{cat}</span>
                    {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-white dark:bg-zinc-900 ml-2 shrink-0"></span>}
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-2">
              Descrizione del problema
            </label>
            <textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descrivi brevemente cosa stavi facendo e quale comportamento imprevisto si è verificato..."
              className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-600 focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-100 resize-none"
            />
          </div>

          <div>
            <div className="flex items-center gap-2 mb-2">
              <Terminal className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
              <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Diagnostica inclusa automaticamente
              </label>
            </div>
            <div className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3.5 space-y-1.5 text-xs font-mono text-zinc-600 dark:text-zinc-400">
              <div className="flex justify-between">
                <span className="text-zinc-400 dark:text-zinc-500">Versione:</span>
                <span className="text-zinc-800 dark:text-zinc-200">{APP_VERSION}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400 dark:text-zinc-500">Sistema Operativo:</span>
                <span className="text-zinc-800 dark:text-zinc-200">{systemPlatform || 'Desktop'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400 dark:text-zinc-500">Timestamp:</span>
                <span className="text-zinc-800 dark:text-zinc-200">{new Date().toLocaleTimeString('it-IT')}</span>
              </div>
              <div className="pt-1.5 border-t border-zinc-200/60 dark:border-zinc-800/60">
                <span className="text-zinc-400 dark:text-zinc-500 block mb-0.5">Ultimo errore:</span>
                <p className={`break-words text-xs ${lastError ? 'text-red-600 dark:text-red-400' : 'text-zinc-500'}`}>
                  {lastError ? String(lastError) : 'Nessun errore recente registrato'}
                </p>
              </div>
            </div>
          </div>

          {mailtoNotice && (
            <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl text-xs text-amber-800 dark:text-amber-300 flex items-start justify-between gap-2 animate-in fade-in duration-200">
              <span>
                Se non si è aperta alcuna app di posta sul tuo computer, puoi usare l'opzione <strong>Gmail (Web)</strong> dal pulsante <em>Invia Email</em>, oppure copiare il report e inviarlo con il tuo servizio webmail.
              </span>
              <button
                type="button"
                onClick={() => setMailtoNotice(false)}
                className="text-amber-600 hover:text-amber-800 dark:text-amber-400 p-0.5 shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/50 flex flex-col sm:flex-row gap-3 justify-end relative">
          <button
            type="button"
            onClick={handleCopyReport}
            className="px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-sm font-medium transition-colors flex items-center justify-center gap-2"
          >
            {copiedReport ? (
              <>
                <Check className="w-4 h-4 text-emerald-500" />
                <span>Report copiato!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>Copia Report</span>
              </>
            )}
          </button>

          <div className="relative">
            <button
              type="button"
              onClick={() => setShowSendMenu(!showSendMenu)}
              className="w-full sm:w-auto px-5 py-2.5 bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-100 text-white dark:text-zinc-900 rounded-xl font-medium text-sm transition-colors shadow-sm flex items-center justify-center gap-2"
            >
              <Mail className="w-4 h-4" />
              <span>Invia Email</span>
              <ChevronDown className={`w-4 h-4 transition-transform ${showSendMenu ? 'rotate-180' : ''}`} />
            </button>

            {showSendMenu && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowSendMenu(false)}
                />
                <div className="absolute bottom-full right-0 mb-2 w-72 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl p-2 z-50 space-y-1 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 border-b border-zinc-100 dark:border-zinc-800 mb-1">
                    Scegli come inviare
                  </div>
                  <button
                    type="button"
                    onClick={handleSendGmail}
                    className="w-full text-left px-3 py-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors flex items-start gap-2.5"
                  >
                    <Mail className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                    <div>
                      <div className="text-xs font-semibold text-zinc-900 dark:text-white">Gmail (Web)</div>
                      <div className="text-[11px] text-zinc-500 dark:text-zinc-400">Apre Gmail nel browser con il testo pronto</div>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={handleSendOutlook}
                    className="w-full text-left px-3 py-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors flex items-start gap-2.5"
                  >
                    <Mail className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                    <div>
                      <div className="text-xs font-semibold text-zinc-900 dark:text-white">Outlook (Web)</div>
                      <div className="text-[11px] text-zinc-500 dark:text-zinc-400">Apre Outlook nel browser</div>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={handleSendMailto}
                    className="w-full text-left px-3 py-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors flex items-start gap-2.5"
                  >
                    <Terminal className="w-4 h-4 text-zinc-500 dark:text-zinc-400 mt-0.5 shrink-0" />
                    <div>
                      <div className="text-xs font-semibold text-zinc-900 dark:text-white">Client di Posta Predefinito</div>
                      <div className="text-[11px] text-zinc-500 dark:text-zinc-400">Thunderbird, Apple Mail, Outlook desktop</div>
                    </div>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export { ReportIssueModal }
