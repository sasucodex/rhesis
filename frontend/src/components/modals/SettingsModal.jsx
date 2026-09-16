import { useState, useEffect } from 'react'
import {
  AlertCircle,
  Moon,
  Sun,
  Loader2,
  X,
  FileText,
  ShieldCheck,
  LifeBuoy,
  BookOpen,
  LogOut,
  Info
} from 'lucide-react'

export default function SettingsModal({
  isOpen,
  onClose,
  isDarkMode,
  setIsDarkMode,
  apiKeyValid,
  apiKeyStatus = 'valid',
  isValidatingKey,
  settingsError,
  setSettingsError,
  enableChapters,
  enableTimestamps,
  preserveAudio = true,
  onSave,
  onOpenOnboarding,
  onLogout,
  onOpenLegal,
  onOpenReportIssue,
}) {
  const [apiKeyInput, setApiKeyInput] = useState('')
  const [originalTheme] = useState(isDarkMode)
  const [tempEnableChapters, setTempEnableChapters] = useState(enableChapters)
  const [tempEnableTimestamps, setTempEnableTimestamps] = useState(enableTimestamps)
  const [tempPreserveAudio, setTempPreserveAudio] = useState(preserveAudio)
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false)

  const hasUnsavedChanges = () => {
    return (
      apiKeyInput.trim() !== '' ||
      isDarkMode !== originalTheme ||
      tempEnableChapters !== enableChapters ||
      tempEnableTimestamps !== enableTimestamps ||
      tempPreserveAudio !== preserveAudio
    )
  }

  const handleCloseAttempt = () => {
    if (hasUnsavedChanges()) {
      setShowUnsavedWarning(true)
    } else {
      onClose()
    }
  }

  const discardChanges = () => {
    setIsDarkMode(originalTheme)
    setApiKeyInput('')
    if (setSettingsError) setSettingsError('')
    setTempEnableChapters(enableChapters)
    setTempEnableTimestamps(enableTimestamps)
    setTempPreserveAudio(preserveAudio)
    setShowUnsavedWarning(false)
    onClose()
  }

  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (showUnsavedWarning) {
          setShowUnsavedWarning(false)
        } else {
          const hasChanges =
            apiKeyInput.trim() !== '' ||
            isDarkMode !== originalTheme ||
            tempEnableChapters !== enableChapters ||
            tempEnableTimestamps !== enableTimestamps ||
            tempPreserveAudio !== preserveAudio

          if (hasChanges) {
            setShowUnsavedWarning(true)
          } else {
            onClose()
          }
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, showUnsavedWarning, apiKeyInput, isDarkMode, originalTheme, tempEnableChapters, enableChapters, tempEnableTimestamps, enableTimestamps, tempPreserveAudio, preserveAudio, onClose])

  if (!isOpen) return null

  const handleSave = () => {
    onSave({
      newApiKey: apiKeyInput.trim(),
      enableChapters: tempEnableChapters,
      enableTimestamps: tempEnableTimestamps,
      preserveAudio: tempPreserveAudio
    })
  }

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget && !showUnsavedWarning) {
          handleCloseAttempt()
        }
      }}
    >
      <div
        className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 sm:p-8 rounded-3xl max-w-md w-full shadow-2xl relative max-h-[92vh] overflow-y-auto custom-scrollbar animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {showUnsavedWarning && (
          <div className="absolute inset-0 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md z-20 rounded-3xl p-6 sm:p-8 flex flex-col justify-center items-center text-center animate-in zoom-in-95 duration-200">
            <AlertCircle className="w-12 h-12 text-amber-500 mb-4" />
            <h4 className="text-xl font-bold mb-2 text-zinc-900 dark:text-white">Modifiche non salvate</h4>
            <p className="text-zinc-500 dark:text-zinc-400 text-sm mb-6">
              Le tue modifiche alle impostazioni andranno perse. Vuoi procedere?
            </p>
            <div className="space-y-3 w-full">
              <button
                type="button"
                onClick={discardChanges}
                className="w-full py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl font-medium transition-colors text-sm shadow-sm"
              >
                Esci senza salvare
              </button>
              <button
                type="button"
                onClick={() => setShowUnsavedWarning(false)}
                className="w-full py-2.5 bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 rounded-xl font-medium transition-colors text-sm"
              >
                Torna alle impostazioni
              </button>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-zinc-900 dark:text-white">Impostazioni</h3>
          <button
            type="button"
            onClick={handleCloseAttempt}
            className="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors"
            title="Chiudi"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-6">
          <div className="flex items-center justify-between p-4 bg-zinc-100 dark:bg-zinc-950 rounded-2xl border border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center gap-3">
              {isDarkMode ? (
                <Moon className="w-5 h-5 text-zinc-300" />
              ) : (
                <Sun className="w-5 h-5 text-amber-500" />
              )}
              <span className="font-medium text-sm text-zinc-900 dark:text-zinc-100">Tema Scuro</span>
            </div>
            <button
              type="button"
              onClick={() => setIsDarkMode(!isDarkMode)}
              className={`w-12 h-6 rounded-full relative transition-colors ${
                isDarkMode ? 'bg-zinc-900 dark:bg-zinc-100' : 'bg-zinc-300'
              }`}
            >
              <div
                className={`absolute top-1 left-1 w-4 h-4 rounded-full transition-transform ${
                  isDarkMode ? 'translate-x-6 bg-white dark:bg-zinc-900' : 'bg-white'
                }`}
              />
            </button>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <label className="block text-sm text-zinc-500 dark:text-zinc-400 font-medium">
                  Stato Chiave API
                </label>
                <button
                  type="button"
                  onClick={() => onOpenOnboarding && onOpenOnboarding(2)}
                  title="Come ottenere una chiave API Google"
                  className="p-1 rounded-md text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                >
                  <Info className="w-3.5 h-3.5" />
                </button>
              </div>
              {apiKeyValid ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  Valida
                </span>
              ) : apiKeyStatus === 'unreachable' ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                  Non verificata (Offline)
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-300 border border-red-200 dark:border-red-800">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                  Non valida o Scaduta
                </span>
              )}
            </div>
            <label className="block text-xs text-zinc-400 dark:text-zinc-500">
              Modifica o sostituisci chiave
            </label>
            <input
              type="password"
              placeholder="Nuova API Key..."
              value={apiKeyInput}
              disabled={isValidatingKey}
              onChange={(e) => {
                setApiKeyInput(e.target.value)
                if (settingsError && setSettingsError) setSettingsError('')
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !isValidatingKey) handleSave()
              }}
              className="w-full bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-xl px-4 py-2.5 text-zinc-900 dark:text-white focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-100 disabled:opacity-50 text-sm"
            />
            {settingsError && (
              <div className="flex items-start gap-2 p-2.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 rounded-xl text-red-700 dark:text-red-300 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-500 mt-0.5" />
                <span>{settingsError}</span>
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Opzioni Trascrizione
            </h4>
            <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800">
              <span className="font-medium text-sm text-zinc-700 dark:text-zinc-200">
                Genera capitoli per argomento
              </span>
              <button
                type="button"
                onClick={() => setTempEnableChapters(!tempEnableChapters)}
                className={`w-12 h-6 rounded-full relative transition-colors shrink-0 ${
                  tempEnableChapters ? 'bg-zinc-900 dark:bg-zinc-100' : 'bg-zinc-300 dark:bg-zinc-700'
                }`}
              >
                <div
                  className={`absolute top-1 left-1 w-4 h-4 rounded-full transition-transform ${
                    tempEnableChapters ? 'translate-x-6 bg-white dark:bg-zinc-900' : 'bg-white'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800">
              <span className="font-medium text-sm text-zinc-700 dark:text-zinc-200">
                Includi timestamp (minutaggi)
              </span>
              <button
                type="button"
                onClick={() => setTempEnableTimestamps(!tempEnableTimestamps)}
                className={`w-12 h-6 rounded-full relative transition-colors shrink-0 ${
                  tempEnableTimestamps ? 'bg-zinc-900 dark:bg-zinc-100' : 'bg-zinc-300 dark:bg-zinc-700'
                }`}
              >
                <div
                  className={`absolute top-1 left-1 w-4 h-4 rounded-full transition-transform ${
                    tempEnableTimestamps ? 'translate-x-6 bg-white dark:bg-zinc-900' : 'bg-white'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800">
              <span className="font-medium text-sm text-zinc-700 dark:text-zinc-200">
                Conserva file audio originale
              </span>
              <button
                type="button"
                onClick={() => setTempPreserveAudio(!tempPreserveAudio)}
                className={`w-12 h-6 rounded-full relative transition-colors shrink-0 ${
                  tempPreserveAudio ? 'bg-zinc-900 dark:bg-zinc-100' : 'bg-zinc-300 dark:bg-zinc-700'
                }`}
              >
                <div
                  className={`absolute top-1 left-1 w-4 h-4 rounded-full transition-transform ${
                    tempPreserveAudio ? 'translate-x-6 bg-white dark:bg-zinc-900' : 'bg-white'
                  }`}
                />
              </button>
            </div>
          </div>

          <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-2">
              Informazioni e Supporto
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => onOpenLegal('termini')}
                className="p-2.5 bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-950 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 rounded-xl font-medium transition-colors text-xs flex items-center gap-2 border border-zinc-200 dark:border-zinc-800"
              >
                <FileText className="w-4 h-4 text-zinc-500 dark:text-zinc-400 shrink-0" />
                <span>Termini di Utilizzo</span>
              </button>
              <button
                type="button"
                onClick={() => onOpenLegal('privacy')}
                className="p-2.5 bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-950 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 rounded-xl font-medium transition-colors text-xs flex items-center gap-2 border border-zinc-200 dark:border-zinc-800"
              >
                <ShieldCheck className="w-4 h-4 text-zinc-500 dark:text-zinc-400 shrink-0" />
                <span>Informativa Privacy</span>
              </button>
            </div>
            <button
              type="button"
              onClick={onOpenReportIssue}
              className="w-full p-2.5 bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-950 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 rounded-xl font-medium transition-colors text-xs flex items-center justify-center gap-2 border border-zinc-200 dark:border-zinc-800"
            >
              <LifeBuoy className="w-4 h-4 text-zinc-500 dark:text-zinc-400 shrink-0" />
              <span>Segnala un Problema</span>
            </button>
          </div>

          <div className="flex gap-3 pt-4 border-t border-zinc-200 dark:border-zinc-800">
            <button
              type="button"
              onClick={handleCloseAttempt}
              className="flex-1 py-2.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-xl font-medium text-zinc-700 dark:text-zinc-300 text-sm transition-colors"
            >
              Chiudi
            </button>
            <button
              type="button"
              disabled={isValidatingKey}
              onClick={handleSave}
              className="flex-1 py-2.5 bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-100 rounded-xl font-medium text-white dark:text-zinc-900 text-sm shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
            >
              {isValidatingKey ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Verifica...</span>
                </>
              ) : (
                <span>Salva</span>
              )}
            </button>
          </div>

          <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800 space-y-2">
            <button
              type="button"
              onClick={onOpenOnboarding}
              className="w-full py-2.5 bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-950 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 rounded-xl font-medium transition-colors text-xs flex items-center justify-center gap-2 border border-zinc-200 dark:border-zinc-800"
            >
              <BookOpen className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
              <span>Rivedi guida iniziale</span>
            </button>
            <button
              type="button"
              onClick={onLogout}
              className="w-full py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl font-medium transition-colors text-xs flex items-center justify-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              <span>Scollega API Key (Logout)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export { SettingsModal }
