import { Check, Loader2, FileAudio } from 'lucide-react'

const STAGES = [
  {
    id: 'upload_local',
    name: 'Salvataggio locale',
    desc: 'Salvataggio audio nella memoria sicura locale',
    defaultProgress: 15,
  },
  {
    id: 'upload_google',
    name: 'Upload su Google Files',
    desc: 'Caricamento protetto sui server di Google AI Studio',
    defaultProgress: 35,
  },
  {
    id: 'processing_google',
    name: 'Elaborazione audio',
    desc: 'Analisi e preparazione della traccia audio sui server cloud',
    defaultProgress: 55,
  },
  {
    id: 'gemini_generating',
    name: 'Trascrizione',
    desc: "Trascrizione fedele dell'audio con Gemini",
    defaultProgress: 75,
  },
  {
    id: 'completed',
    name: 'Completamento',
    desc: 'Finalizzazione del testo e salvataggio nel database locale',
    defaultProgress: 100,
  },
]

const STAGE_ORDER = ['upload_local', 'upload_google', 'processing_google', 'gemini_generating', 'completed']

export default function ProcessingStatus({ task, file }) {
  const currentStatus = task?.status || 'upload_local'
  const currentStageIndex = STAGE_ORDER.indexOf(currentStatus) >= 0
    ? STAGE_ORDER.indexOf(currentStatus)
    : 0

  const currentStageObj = STAGES[currentStageIndex] || STAGES[0]
  const progress = task?.progress !== undefined ? task.progress : currentStageObj.defaultProgress

  return (
    <div className="w-full max-w-xl bg-white dark:bg-[#131314] border border-zinc-200 dark:border-zinc-800 rounded-3xl p-8 shadow-sm transition-all space-y-6">
      {file && (
        <div className="flex items-center gap-3 p-3 bg-zinc-50 dark:bg-zinc-900/60 rounded-2xl border border-zinc-200/60 dark:border-zinc-800/60">
          <div className="p-2 bg-zinc-200/60 dark:bg-zinc-800 rounded-xl text-zinc-700 dark:text-zinc-300 shrink-0">
            <FileAudio className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200 truncate">
              {file.name}
            </p>
            <p className="text-xs text-zinc-400">
              {(file.size / (1024 * 1024)).toFixed(2)} MB
            </p>
          </div>
        </div>
      )}

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              {currentStatus === 'completed' ? (
                <>
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 animate-in zoom-in-75 duration-300">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </span>
                  <span>Trascrizione completata!</span>
                </>
              ) : (
                'Trascrizione in corso'
              )}
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              {task?.message || currentStageObj.desc}
            </p>
          </div>
          <span
            className={`font-mono text-sm font-bold px-3 py-1 rounded-full border transition-all duration-300 ${
              currentStatus === 'completed'
                ? 'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 scale-105'
                : 'text-zinc-900 dark:text-zinc-100 bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700'
            }`}
          >
            {progress}%
          </span>
        </div>

        <div className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-full h-2.5 overflow-hidden">
          <div
            className={`h-2.5 rounded-full transition-all duration-700 ease-out ${
              currentStatus === 'completed'
                ? 'bg-emerald-600 dark:bg-emerald-500'
                : 'bg-zinc-900 dark:bg-zinc-100'
            }`}
            style={{ width: `${Math.min(Math.max(progress, 8), 100)}%` }}
          />
        </div>
      </div>

      <div className="pt-2">
        {STAGES.map((stage, idx) => {
          const isDone = idx < currentStageIndex || currentStatus === 'completed'
          const isActive = idx === currentStageIndex && currentStatus !== 'completed'

          return (
            <div key={stage.id} className="relative flex items-start gap-4">
              {idx < STAGES.length - 1 && (
                <div
                  className={`absolute left-3.5 top-3.5 -bottom-3.5 w-0.5 -ml-px transition-colors duration-300 ${
                    idx < currentStageIndex || currentStatus === 'completed'
                      ? 'bg-zinc-900 dark:bg-zinc-100'
                      : 'bg-zinc-200 dark:bg-zinc-800'
                  }`}
                />
              )}
              <div
                className={`relative z-10 w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 transition-all duration-300 ${
                  isDone
                    ? currentStatus === 'completed' && idx === 4
                      ? 'bg-emerald-600 dark:bg-emerald-500 text-white shadow-sm'
                      : 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900'
                    : isActive
                    ? 'border-2 border-zinc-900 dark:border-zinc-100 bg-white dark:bg-[#131314] text-zinc-900 dark:text-zinc-100'
                    : 'border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 text-zinc-400 dark:text-zinc-500'
                }`}
              >
                {isDone ? (
                  <Check className={`w-3.5 h-3.5 stroke-[3] ${currentStatus === 'completed' && idx === 4 ? 'animate-in zoom-in-75 duration-300' : ''}`} />
                ) : isActive ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-zinc-900 dark:text-zinc-100" />
                ) : (
                  <span>{idx + 1}</span>
                )}
              </div>
              <div className={`flex-1 min-w-0 ${idx === STAGES.length - 1 ? 'pb-1' : 'pb-5'}`}>
                <div className="flex items-center justify-between">
                  <h4
                    className={`text-sm ${
                      isActive
                        ? 'text-zinc-900 dark:text-zinc-100 font-semibold'
                        : isDone
                        ? 'text-zinc-700 dark:text-zinc-300 font-medium'
                        : 'text-zinc-400 dark:text-zinc-500'
                    }`}
                  >
                    {stage.name}
                  </h4>
                  {isActive && (
                    <span className="text-xs text-zinc-500 dark:text-zinc-400 animate-pulse font-medium">
                      In corso...
                    </span>
                  )}
                  {currentStatus === 'completed' && idx === 4 && (
                    <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold animate-in fade-in duration-300">
                      Pronto!
                    </span>
                  )}
                </div>
                <p
                  className={`text-xs mt-0.5 ${
                    isActive
                      ? 'text-zinc-600 dark:text-zinc-300'
                      : isDone
                      ? 'text-zinc-400 dark:text-zinc-500'
                      : 'text-zinc-400/60 dark:text-zinc-600'
                  }`}
                >
                  {isActive && task?.message ? task.message : stage.desc}
                </p>
              </div>
            </div>
          )
        })}
      </div>

      <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800/80 text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-2">
        <span className="text-sm">💡</span>
        <span>
          L'elaborazione avviene in background. Per lezioni di 1-3 ore, la trascrizione fedele richiede tipicamente 1-2 minuti.
        </span>
      </div>
    </div>
  )
}
