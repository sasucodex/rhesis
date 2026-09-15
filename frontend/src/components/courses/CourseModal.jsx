import { useState, useEffect, useCallback } from 'react'
import { X, Check, BookOpen, Trash2, AlertCircle, Loader2 } from 'lucide-react'

const STANDARD_PALETTE = [
  { name: 'Rosso', value: '#ef4444' },
  { name: 'Arancione', value: '#f97316' },
  { name: 'Giallo', value: '#eab308' },
  { name: 'Verde', value: '#22c55e' },
  { name: 'Smeraldo', value: '#10b981' },
  { name: 'Ciano', value: '#06b6d4' },
  { name: 'Blu', value: '#3b82f6' },
  { name: 'Indaco', value: '#6366f1' },
  { name: 'Viola', value: '#a855f7' },
  { name: 'Rosa', value: '#ec4899' },
  { name: 'Marrone', value: '#854d0e' },
  { name: 'Grigio', value: '#64748b' },
]

function CourseModalForm({ courseToEdit, onClose, onSave, onDelete }) {
  const initialName = courseToEdit?.name || ''
  const initialProfessorName = courseToEdit?.professor_name || ''
  const initialColor = courseToEdit?.color || '#ef4444'

  const [name, setName] = useState(initialName)
  const [professorName, setProfessorName] = useState(initialProfessorName)
  const [color, setColor] = useState(initialColor)
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const hasUnsavedChanges = useCallback(() => {
    return (
      name !== initialName ||
      professorName !== initialProfessorName ||
      color !== initialColor
    )
  }, [name, professorName, color, initialName, initialProfessorName, initialColor])

  const handleCloseAttempt = useCallback(() => {
    if (hasUnsavedChanges()) {
      setShowUnsavedWarning(true)
    } else {
      onClose()
    }
  }, [hasUnsavedChanges, onClose])

  const discardChanges = () => {
    setShowUnsavedWarning(false)
    onClose()
  }

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (showDeleteConfirm) {
          setShowDeleteConfirm(false)
        } else if (showUnsavedWarning) {
          setShowUnsavedWarning(false)
        } else {
          handleCloseAttempt()
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [showDeleteConfirm, showUnsavedWarning, handleCloseAttempt])

  const handleSubmit = async (e) => {
    e.preventDefault()
    const trimmedName = name.trim()
    if (!trimmedName) {
      setError('Inserisci il nome del corso.')
      return
    }

    setIsSubmitting(true)
    setError('')
    try {
      await onSave({
        name: trimmedName,
        professor_name: professorName.trim() || null,
        color,
      })
      onClose()
    } catch (err) {
      setError(err.message || 'Errore durante il salvataggio del corso')
    } finally {
      setIsSubmitting(false)
    }
  }

  const executeDelete = async () => {
    if (!courseToEdit || !onDelete) return
    setIsSubmitting(true)
    setError('')
    try {
      await onDelete(courseToEdit.id)
      onClose()
    } catch (err) {
      setError(err.message || "Errore durante l'eliminazione")
      setShowDeleteConfirm(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget && !showUnsavedWarning && !showDeleteConfirm) {
          handleCloseAttempt()
        }
      }}
    >
      <div
        className="w-full max-w-md bg-white dark:bg-[#18181b] border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col relative animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {showUnsavedWarning && (
          <div className="absolute inset-0 bg-white/95 dark:bg-[#18181b]/95 backdrop-blur-md z-20 rounded-3xl p-6 sm:p-8 flex flex-col justify-center items-center text-center animate-in zoom-in-95 duration-200">
            <AlertCircle className="w-12 h-12 text-amber-500 mb-4" />
            <h4 className="text-xl font-bold mb-2 text-zinc-900 dark:text-white">
              Modifiche non salvate
            </h4>
            <p className="text-zinc-500 dark:text-zinc-400 text-sm mb-6">
              Le tue modifiche al corso andranno perse. Vuoi procedere?
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
                Continua a modificare
              </button>
            </div>
          </div>
        )}

        {showDeleteConfirm && (
          <div className="absolute inset-0 bg-white/95 dark:bg-[#18181b]/95 backdrop-blur-md z-20 rounded-3xl p-6 sm:p-8 flex flex-col justify-center items-center text-center animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-950/60 flex items-center justify-center text-red-600 dark:text-red-400 mb-4">
              <Trash2 className="w-6 h-6" />
            </div>
            <h4 className="text-lg font-bold text-zinc-900 dark:text-white mb-2">
              Eliminare il corso?
            </h4>
            <p className="text-zinc-600 dark:text-zinc-400 text-sm mb-6 max-w-sm">
              Sei sicuro di voler eliminare il corso <span className="font-semibold text-zinc-900 dark:text-zinc-100">"{courseToEdit?.name}"</span>? Le lezioni associate rimarranno salvate e passeranno a non categorizzate.
            </p>
            <div className="flex gap-3 justify-end w-full">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-2.5 px-4 text-sm font-medium text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-xl transition-colors"
              >
                Annulla
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={executeDelete}
                className="flex-1 py-2.5 px-4 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-xl transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Eliminazione...</span>
                  </>
                ) : (
                  <span>Elimina definitivamente</span>
                )}
              </button>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-white shrink-0 shadow-sm"
              style={{ backgroundColor: color }}
            >
              <BookOpen className="w-4 h-4" />
            </div>
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              {courseToEdit ? 'Modifica Corso' : 'Nuovo Corso'}
            </h3>
          </div>
          <button
            type="button"
            onClick={handleCloseAttempt}
            className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="p-3 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-xl">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5">
              Nome del Corso <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="es. Diritto Privato, Analisi Matematica..."
              className="w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-900/70 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 text-sm"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5">
              Nome del Docente (Opzionale)
            </label>
            <input
              type="text"
              value={professorName}
              onChange={(e) => setProfessorName(e.target.value)}
              placeholder="es. Prof. Mario Rossi"
              className="w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-900/70 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-2">
              Colore
            </label>
            <div className="grid grid-cols-6 gap-2">
              {STANDARD_PALETTE.map((c) => {
                const isSelected = color.toLowerCase() === c.value.toLowerCase()
                return (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setColor(c.value)}
                    title={c.name}
                    className={`h-9 rounded-xl flex items-center justify-center transition-all ${
                      isSelected
                        ? 'ring-2 ring-offset-2 ring-zinc-900 dark:ring-white dark:ring-offset-zinc-900 scale-105 shadow-md'
                        : 'hover:scale-105 opacity-85 hover:opacity-100'
                    }`}
                    style={{ backgroundColor: c.value }}
                  >
                    {isSelected && <Check className="w-4 h-4 text-white drop-shadow-sm" />}
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5">
              Anteprima
            </label>
            <div className="p-3 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-2xl flex items-center gap-3">
              <span
                className="w-3.5 h-3.5 rounded-full shrink-0 shadow-xs"
                style={{ backgroundColor: color }}
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                  {name.trim() || 'Nome del Corso'}
                </p>
                {professorName.trim() && (
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                    {professorName.trim()}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 gap-3">
            {courseToEdit && onDelete ? (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={isSubmitting}
                className="py-2.5 px-3.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-full font-medium text-sm transition-colors flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                Elimina
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCloseAttempt}
                disabled={isSubmitting}
                className="py-2.5 px-4 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full font-medium text-sm transition-colors"
              >
                Annulla
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !name.trim()}
                className="py-2.5 px-5 bg-zinc-900 dark:bg-white hover:bg-zinc-800 dark:hover:bg-zinc-100 text-white dark:text-zinc-900 rounded-full font-medium text-sm transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Salvataggio...' : courseToEdit ? 'Salva Modifiche' : 'Crea Corso'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function CourseModal({
  isOpen,
  onClose,
  onSave,
  courseToEdit = null,
  onDelete = null,
}) {
  if (!isOpen) return null

  return (
    <CourseModalForm
      key={courseToEdit ? `edit-${courseToEdit.id}` : 'new-course'}
      courseToEdit={courseToEdit}
      onClose={onClose}
      onSave={onSave}
      onDelete={onDelete}
    />
  )
}
