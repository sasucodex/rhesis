import { useState, useRef, useEffect } from 'react'
import { Pencil, Check, X, Copy, CheckCircle, Download } from 'lucide-react'

export default function EditorHeader({
  filename,
  dateStr,
  isEditing,
  isCopied,
  onRename,
  onCopy,
  onExport,
  onEditToggle,
}) {
  const [isRenaming, setIsRenaming] = useState(false)
  const [titleInput, setTitleInput] = useState('')
  const inputRef = useRef(null)

  const displayName = filename ? filename.replace(/^\d+_/, '') : 'Trascrizione'

  useEffect(() => {
    if (isRenaming && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isRenaming])

  const handleStartRename = () => {
    setTitleInput(displayName)
    setIsRenaming(true)
  }

  const handleCancelRename = () => {
    setIsRenaming(false)
    setTitleInput('')
  }

  const handleSaveRename = () => {
    const trimmed = titleInput.trim()
    if (trimmed && trimmed !== displayName) {
      onRename(trimmed)
    }
    setIsRenaming(false)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSaveRename()
    } else if (e.key === 'Escape') {
      handleCancelRename()
    }
  }

  return (
    <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-[#131314] flex-wrap gap-4 shrink-0">
      <div className="flex items-center gap-2 min-w-0 max-w-full">
        {isRenaming ? (
          <div className="flex items-center gap-1.5">
            <input
              ref={inputRef}
              type="text"
              value={titleInput}
              onChange={(e) => setTitleInput(e.target.value)}
              onKeyDown={handleKeyDown}
              className="px-2.5 py-1 text-sm font-medium bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-600"
            />
            <button
              type="button"
              onClick={handleSaveRename}
              className="p-1 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 rounded transition-colors"
              title="Salva titolo"
            >
              <Check className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleCancelRename}
              className="p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded transition-colors"
              title="Annulla"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 min-w-0">
            <h2
              className="text-base font-semibold text-zinc-900 dark:text-zinc-100 truncate max-w-[240px] sm:max-w-[320px] md:max-w-[420px]"
              title={displayName}
            >
              {displayName}
            </h2>
            <button
              type="button"
              onClick={handleStartRename}
              className="p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded transition-colors shrink-0"
              title="Rinomina"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
            {dateStr && (
              <div className="text-zinc-400 text-sm font-normal hidden sm:flex items-center gap-2 shrink-0">
                <span className="text-[10px]">●</span>
                <span>{dateStr}</span>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        {isCopied ? (
          <button
            type="button"
            className="p-2 px-3 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 rounded-lg transition-colors flex items-center gap-2 text-sm font-medium border border-emerald-200 dark:border-emerald-500/30 cursor-default"
          >
            <CheckCircle className="w-4 h-4" /> Copiato
          </button>
        ) : (
          <button
            type="button"
            onClick={onCopy}
            className="p-2 px-3 text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors flex items-center gap-2 text-sm font-medium border border-zinc-200 dark:border-zinc-700"
          >
            <Copy className="w-4 h-4" /> Copia
          </button>
        )}
        <button
          type="button"
          onClick={() => onExport('word')}
          className="p-2 px-3 text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors flex items-center gap-2 text-sm font-medium border border-zinc-200 dark:border-zinc-700"
        >
          <Download className="w-4 h-4 text-blue-500 dark:text-blue-400" /> Word
        </button>
        <button
          type="button"
          onClick={() => onExport('pdf')}
          className="p-2 px-3 text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors flex items-center gap-2 text-sm font-medium border border-zinc-200 dark:border-zinc-700"
        >
          <Download className="w-4 h-4 text-red-500 dark:text-red-400" /> PDF
        </button>
        {!isEditing && (
          <button
            type="button"
            onClick={onEditToggle}
            className="p-2 px-3 text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors flex items-center gap-2 text-sm font-medium border border-zinc-200 dark:border-zinc-700 ml-2"
          >
            <Pencil className="w-4 h-4 text-emerald-500 dark:text-emerald-400" /> Modifica
          </button>
        )}
      </div>
    </div>
  )
}
