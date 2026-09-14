import { useState, useEffect } from 'react'
import { FileText, ShieldCheck, X } from 'lucide-react'

export default function LegalModal({ isOpen, activeTab = 'termini', onClose }) {
  const [currentTab, setCurrentTab] = useState(activeTab)
  const [prevActiveTab, setPrevActiveTab] = useState(activeTab)

  if (activeTab !== prevActiveTab) {
    setPrevActiveTab(activeTab)
    setCurrentTab(activeTab)
  }

  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-900 dark:text-zinc-100">
              {currentTab === 'privacy' ? (
                <ShieldCheck className="w-5 h-5" />
              ) : (
                <FileText className="w-5 h-5" />
              )}
            </div>
            <div>
              <h3 className="text-lg font-bold text-zinc-900 dark:text-white">
                {currentTab === 'privacy' ? 'Informativa sulla Privacy' : 'Termini di Utilizzo'}
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Informazioni legali, privacy e conformità accademica di Rhesis
              </p>
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

        <div className="px-6 pt-4 border-b border-zinc-200 dark:border-zinc-800 flex gap-2 bg-zinc-50/50 dark:bg-zinc-950/50">
          <button
            type="button"
            onClick={() => setCurrentTab('termini')}
            className={`pb-3 px-4 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
              currentTab === 'termini'
                ? 'border-zinc-900 dark:border-white text-zinc-900 dark:text-white font-semibold'
                : 'border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Termini di Utilizzo</span>
          </button>
          <button
            type="button"
            onClick={() => setCurrentTab('privacy')}
            className={`pb-3 px-4 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
              currentTab === 'privacy'
                ? 'border-zinc-900 dark:border-white text-zinc-900 dark:text-white font-semibold'
                : 'border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Informativa sulla Privacy</span>
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6 text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed custom-scrollbar flex-1">
          {currentTab === 'termini' ? (
            <>
              <section className="space-y-2">
                <h4 className="font-semibold text-zinc-900 dark:text-zinc-100 text-base">
                  1. Finalità Esclusiva di Studio Personale
                </h4>
                <p>
                  Rhesis è concepito e rilasciato per assistere gli studenti universitari nella trascrizione, organizzazione e consultazione delle lezioni a cui prendono parte, al solo ed esclusivo fine dello studio individuale e della ricerca accademica.
                </p>
              </section>

              <section className="space-y-2">
                <h4 className="font-semibold text-zinc-900 dark:text-zinc-100 text-base">
                  2. Rispetto dei Regolamenti d'Ateneo e Consenso
                </h4>
                <p>
                  L'utente dichiara e garantisce di utilizzare Rhesis nel pieno rispetto dei regolamenti accademici del proprio Ateneo, del codice etico di istituto e delle direttive impartite dai docenti titolari dell'insegnamento. La registrazione audio delle lezioni deve avvenire sempre previa informazione ed eventuale consenso esplicito del docente responsabile.
                </p>
              </section>

              <section className="space-y-2">
                <h4 className="font-semibold text-zinc-900 dark:text-zinc-100 text-base">
                  3. Tutela del Diritto d'Autore e Divieto di Diffusione
                </h4>
                <p>
                  Le lezioni, le presentazioni, i contenuti orali e i materiali didattici costituiscono opere dell'ingegno protette dalle vigenti leggi sul diritto d'autore e appartengono ai rispettivi docenti e agli atenei di appartenenza. È fatto espresso divieto di pubblicare, divulgare online, distribuire sui social network o commercializzare le registrazioni audio e le trascrizioni ottenute mediante Rhesis.
                </p>
              </section>

              <section className="space-y-2">
                <h4 className="font-semibold text-zinc-900 dark:text-zinc-100 text-base">
                  4. Esclusione di Responsabilità
                </h4>
                <p>
                  Lo sviluppatore e i collaboratori del progetto Rhesis declinano qualunque responsabilità civile, penale o disciplinare derivante dall'uso improprio, illecito o non autorizzato dell'applicazione da parte dell'utente. L'utente si assume l'intera responsabilità per le registrazioni effettuate e per i dati elaborati tramite la propria chiave API.
                </p>
              </section>
            </>
          ) : (
            <>
              <section className="space-y-2">
                <h4 className="font-semibold text-zinc-900 dark:text-zinc-100 text-base">
                  1. Sovranità dei Dati e Salvataggio Locale
                </h4>
                <p>
                  Rhesis è progettato seguendo il principio cardine della sovranità dei dati: tutti i dati dell'utente, inclusi il database SQLite (<code className="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-xs font-mono text-zinc-800 dark:text-zinc-200">~/.config/rhesis/database.db</code>), le impostazioni e la chiave API (<code className="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-xs font-mono text-zinc-800 dark:text-zinc-200">~/.config/rhesis/config.json</code>) e gli eventuali file audio conservati risiedono esclusivamente sul computer locale dello studente.
                </p>
              </section>

              <section className="space-y-2">
                <h4 className="font-semibold text-zinc-900 dark:text-zinc-100 text-base">
                  2. Assenza di Server Proprietari o Telemetria
                </h4>
                <p>
                  L'applicazione non dispone di server intermedi proprietari, non esegue telemetria, non raccoglie dati comportamentali o statistici e non condivide alcuna informazione con terze parti. Non viene effettuato alcun tracciamento delle attività di studio o delle trascrizioni dell'utente.
                </p>
              </section>

              <section className="space-y-2">
                <h4 className="font-semibold text-zinc-900 dark:text-zinc-100 text-base">
                  3. Chiave API Google Gemini
                </h4>
                <p>
                  La chiave API personale di Google AI Studio fornita dallo studente è memorizzata esclusivamente nel file locale di configurazione. Le chiamate API per la trascrizione e la validazione avvengono in modo diretto tra il backend locale in esecuzione sul computer dell'utente e gli endpoint crittografati HTTPS di Google GenAI.
                </p>
              </section>

              <section className="space-y-2">
                <h4 className="font-semibold text-zinc-900 dark:text-zinc-100 text-base">
                  4. Gestione File su Google Files API
                </h4>
                <p>
                  I file audio inviati per la trascrizione vengono caricati tramite le API ufficiali di Google Files esclusivamente per consentire l'elaborazione e la trascrizione da parte dei modelli di intelligenza artificiale Google Gemini. Come stabilito dalle condizioni d'uso delle API di Google AI Studio, i dati inviati non vengono utilizzati per l'addestramento dei modelli di intelligenza artificiale, e i file temporanei caricati sui server Google vengono rimossi al termine della trascrizione.
                </p>
              </section>

              <section className="space-y-2">
                <h4 className="font-semibold text-zinc-900 dark:text-zinc-100 text-base">
                  5. Cancellazione Totale dei Dati
                </h4>
                <p>
                  L'utente può eliminare le singole lezioni e il testo associato in qualsiasi momento dall'archivio laterale. Dalle Impostazioni è inoltre possibile revocare e rimuovere la chiave API ("Logout") con azzeramento immediato dei dati di autenticazione locali.
                </p>
              </section>
            </>
          )}
        </div>

        <div className="p-6 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/50 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-100 text-white dark:text-zinc-900 rounded-xl font-medium text-sm transition-colors shadow-sm"
          >
            Ho compreso
          </button>
        </div>
      </div>
    </div>
  )
}

export { LegalModal }
