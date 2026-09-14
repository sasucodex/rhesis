import { useState, useEffect } from 'react'
import {
  ShieldCheck,
  Key,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  Lock,
  Eye,
  EyeOff,
  X
} from 'lucide-react'
import step2Img from '../../assets/tutorial/step2_terms.png'
import step3Img from '../../assets/tutorial/step3_create_button.png'
import step4Img from '../../assets/tutorial/step4_project_modal.png'
import step5Img from '../../assets/tutorial/step5_copy_key.png'

export default function OnboardingModal({
  isOpen,
  onComplete,
  onClose,
  canClose = false,
  initialErrorMsg = ''
}) {
  const [currentStep, setCurrentStep] = useState(1)
  const [apiKey, setApiKey] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [isValidating, setIsValidating] = useState(false)
  const [errorMsg, setErrorMsg] = useState(initialErrorMsg)

  useEffect(() => {
    if (!isOpen || !canClose || !onClose) return
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, canClose, onClose])

  if (!isOpen) return null

  const handleNext = () => {
    if (currentStep < 6) {
      setCurrentStep(prev => prev + 1)
    }
  }

  const handlePrev = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1)
    }
  }

  const handleSkip = () => {
    setCurrentStep(6)
  }

  const handleSubmitKey = async (e) => {
    if (e) e.preventDefault()
    const trimmed = apiKey.trim()
    if (!trimmed) {
      setErrorMsg('Inserisci la chiave API prima di convalidare.')
      return
    }

    setIsValidating(true)
    setErrorMsg('')
    try {
      await onComplete(trimmed)
    } catch (err) {
      setErrorMsg(err.message || 'Chiave API non valida o revocata. Verifica e riprova.')
    } finally {
      setIsValidating(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      onClick={() => {
        if (canClose && onClose) onClose()
      }}
    >
      <div
        className="relative w-full max-w-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/80 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 flex items-center justify-center font-bold text-sm">
              {currentStep}
            </div>
            <div>
              <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm">
                Configurazione Iniziale
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Passo {currentStep} di 6
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {currentStep < 6 && (
              <button
                type="button"
                onClick={handleSkip}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors"
              >
                Salta
              </button>
            )}
            {canClose && onClose && (
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                title="Chiudi"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-1 shrink-0">
          <div
            className="bg-zinc-900 dark:bg-zinc-100 h-1 transition-all duration-300 ease-out"
            style={{ width: `${(currentStep / 6) * 100}%` }}
          />
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {currentStep === 1 && (
            <div className="space-y-6 py-2">
              <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 flex items-center justify-center">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                  Benvenuto in Rhesis
                </h2>
                <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-2 leading-relaxed">
                  Rhesis è progettato per la trascrizione fedele e lo studio di lezioni universitarie utilizzando la tecnologia vocale di Google Gemini.
                </p>
              </div>

              {initialErrorMsg && (
                <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 rounded-2xl text-amber-800 dark:text-amber-200 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0 text-amber-500 mt-0.5" />
                  <span className="leading-relaxed">{initialErrorMsg}</span>
                </div>
              )}

              <div className="grid sm:grid-cols-2 gap-4 pt-2">
                <div className="p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 space-y-2">
                  <div className="flex items-center gap-2 text-zinc-900 dark:text-zinc-100 font-semibold text-sm">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span>Quota Gratuita Inclusa</span>
                  </div>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                    Google AI Studio offre un generoso piano gratuito per uso personale, sufficiente per trascrivere decine di ore di lezioni al mese a costo zero.
                  </p>
                </div>

                <div className="p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 space-y-2">
                  <div className="flex items-center gap-2 text-zinc-900 dark:text-zinc-100 font-semibold text-sm">
                    <Lock className="w-4 h-4 text-emerald-500" />
                    <span>Sovranità e Sicurezza</span>
                  </div>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                    La tua API Key e le tue registrazioni restano salvate esclusivamente sul tuo computer locale. Nessun server terzo ha accesso ai tuoi dati.
                  </p>
                </div>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-4">
              <div>
                <h4 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                  Accedi a Google AI Studio
                </h4>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1 leading-relaxed">
                  Apri il portale di Google AI Studio. Al primo accesso con il tuo account Google, spunta la casella per confermare e accettare i termini di servizio e le norme sulla privacy, quindi clicca su <strong>Continua</strong>.
                </p>
              </div>

              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:opacity-90 transition-opacity"
              >
                <span>Apri Google AI Studio</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>

              <div className="rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-zinc-950 shadow-md">
                <img
                  src={step2Img}
                  alt="Schermata termini e privacy Google AI Studio"
                  className="w-full max-h-[360px] object-contain mx-auto"
                />
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-4">
              <div>
                <h4 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                  Crea una nuova Chiave API
                </h4>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1 leading-relaxed">
                  Nella sezione <strong>Chiavi API</strong>, individua il pulsante in alto a destra <strong>Crea chiave API</strong> e selezionalo per avviare la procedura.
                </p>
              </div>

              <div className="rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-zinc-950 shadow-md">
                <img
                  src={step3Img}
                  alt="Pulsante Crea chiave API"
                  className="w-full max-h-[360px] object-contain mx-auto"
                />
              </div>
            </div>
          )}

          {currentStep === 4 && (
            <div className="space-y-4">
              <div>
                <h4 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                  Conferma e Genera il Token
                </h4>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1 leading-relaxed">
                  Nella finestra che appare puoi lasciare il progetto predefinito (o assegnare un nome a piacere). Clicca sul pulsante <strong>Crea chiave</strong> in basso a destra.
                </p>
              </div>

              <div className="rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-zinc-950 shadow-md">
                <img
                  src={step4Img}
                  alt="Finestra di creazione chiave e conferma progetto"
                  className="w-full max-h-[360px] object-contain mx-auto"
                />
              </div>
            </div>
          )}

          {currentStep === 5 && (
            <div className="space-y-4">
              <div>
                <h4 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                  Copia la Chiave Generata
                </h4>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1 leading-relaxed">
                  La tua chiave è pronta. Clicca sul pulsante <strong>Copia chiave</strong> in basso a destra per copiarla negli appunti del tuo sistema operativo.
                </p>
              </div>

              <div className="rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-zinc-950 shadow-md">
                <img
                  src={step5Img}
                  alt="Dettagli della chiave API con pulsante copia"
                  className="w-full max-h-[360px] object-contain mx-auto"
                />
              </div>
            </div>
          )}

          {currentStep === 6 && (
            <form onSubmit={handleSubmitKey} className="space-y-5 py-2">
              <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 flex items-center justify-center">
                <Key className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                  Collega la tua API Key
                </h2>
                <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1.5 leading-relaxed">
                  Incolla la chiave copiata per iniziare a usare Rhesis. Verificheremo subito la connessione ai server di Google Gemini.
                </p>
              </div>

              {errorMsg && (
                <div className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 rounded-2xl text-red-700 dark:text-red-300 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-500 mt-0.5" />
                  <span className="leading-relaxed">{errorMsg}</span>
                </div>
              )}

              <div className="space-y-2">
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  Chiave API Google AI Studio
                </label>
                <div className="relative">
                  <input
                    type={showKey ? 'text' : 'password'}
                    value={apiKey}
                    disabled={isValidating}
                    onChange={(e) => {
                      setApiKey(e.target.value)
                      if (errorMsg) setErrorMsg('')
                    }}
                    placeholder="AIzaSy..."
                    className="w-full bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-2xl pl-4 pr-11 py-3 text-sm text-zinc-900 dark:text-white focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-100 focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-100 disabled:opacity-50 font-mono tracking-wider"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey(prev => !prev)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
                    title={showKey ? 'Nascondi chiave' : 'Mostra chiave'}
                  >
                    {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 flex items-center gap-3">
                <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  La chiave viene validata in tempo reale e salvata solo in locale in <code className="text-zinc-700 dark:text-zinc-300 font-mono">~/.config/rhesis/config.json</code>.
                </p>
              </div>

              <button
                type="submit"
                disabled={isValidating || !apiKey.trim()}
                className="w-full py-3.5 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 font-semibold rounded-2xl transition-all shadow-md disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
              >
                {isValidating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Verifica connessione a Google AI...</span>
                  </>
                ) : (
                  <span>Convalida e Inizia ad Usare Rhesis</span>
                )}
              </button>
            </form>
          )}
        </div>

        <div className="flex items-center justify-between px-6 py-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/80 shrink-0">
          <button
            type="button"
            onClick={handlePrev}
            disabled={currentStep === 1 || isValidating}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-800 disabled:opacity-30 disabled:pointer-events-none transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Indietro</span>
          </button>

          <div className="flex items-center gap-1.5">
            {[1, 2, 3, 4, 5, 6].map(step => (
              <button
                key={step}
                type="button"
                onClick={() => {
                  if (!isValidating) {
                    setCurrentStep(step)
                  }
                }}
                className={`w-2 h-2 rounded-full transition-all ${
                  currentStep === step
                    ? 'w-6 bg-zinc-900 dark:bg-zinc-100'
                    : 'bg-zinc-300 dark:bg-zinc-700 hover:bg-zinc-400 dark:hover:bg-zinc-600'
                }`}
                title={`Vai al passo ${step}`}
              />
            ))}
          </div>

          {currentStep < 6 ? (
            <button
              type="button"
              onClick={handleNext}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:opacity-90 transition-opacity"
            >
              <span>Avanti</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <div className="w-[84px]" />
          )}
        </div>
      </div>
    </div>
  )
}
