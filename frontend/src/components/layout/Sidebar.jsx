import { useState, useEffect } from 'react'
import { FileAudio, Menu, Plus, MessageSquare, Trash2, Settings, Search, X, Loader2 } from 'lucide-react'
import { getRelativeSidebar } from '../../utils/dateUtils'
import { searchTranscriptions } from '../../services/api'

export default function Sidebar({
  historyList = [],
  currentRecordId,
  onSelectRecord,
  onNewTranscription,
  onDeleteClick,
  isOpen,
  onClose,
  onOpenSettings,
  onSearchQueryChange,
}) {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [isSearching, setIsSearching] = useState(false)

  useEffect(() => {
    const trimmed = searchQuery.trim()
    if (!trimmed) return

    const timer = setTimeout(async () => {
      try {
        const results = await searchTranscriptions(trimmed)
        setSearchResults(results)
      } catch (err) {
        console.error('Errore ricerca FTS:', err)
        setSearchResults([])
      } finally {
        setIsSearching(false)
      }
    }, 250)

    return () => clearTimeout(timer)
  }, [searchQuery])

  const handleSearchChange = (e) => {
    const val = e.target.value
    setSearchQuery(val)
    if (onSearchQueryChange) {
      onSearchQueryChange(val.trim())
    }
    if (!val.trim()) {
      setSearchResults([])
      setIsSearching(false)
    } else {
      setIsSearching(true)
    }
  }

  const handleClearSearch = () => {
    setSearchQuery('')
    setSearchResults([])
    setIsSearching(false)
    if (onSearchQueryChange) {
      onSearchQueryChange('')
    }
  }

  const isSearchActive = searchQuery.trim().length > 0
  const currentList = isSearchActive
    ? searchResults.filter((item) => historyList.some((h) => h.id === item.id))
    : historyList

  return (
    <aside
      className={`${
        isOpen ? 'w-72 border-r' : 'w-0'
      } flex-shrink-0 bg-white dark:bg-[#131314] border-zinc-200 dark:border-zinc-800 transition-all duration-300 ease-in-out flex flex-col overflow-hidden`}
    >
      <div className="p-4 flex items-center gap-3">
        <button
          type="button"
          onClick={onClose}
          className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors text-zinc-600 dark:text-zinc-400 shrink-0"
          title="Chiudi barra laterale"
        >
          <Menu className="w-5 h-5" />
        </button>
        <FileAudio className="w-6 h-6 text-zinc-900 dark:text-zinc-100 shrink-0" />
        <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight whitespace-nowrap">
          Rhesis
        </h1>
      </div>

      <div className="px-4 mt-2 space-y-3">
        <button
          type="button"
          onClick={() => {
            handleClearSearch()
            onNewTranscription()
          }}
          className="w-full py-3 px-4 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 rounded-full flex items-center gap-3 transition-colors text-sm font-medium whitespace-nowrap"
        >
          <Plus className="w-5 h-5 text-zinc-500 dark:text-zinc-400 shrink-0" />
          Nuova trascrizione
        </button>

        <div className="relative flex items-center w-full py-1.5 px-4 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200/80 dark:hover:bg-zinc-700/80 focus-within:ring-1 focus-within:ring-zinc-400 dark:focus-within:ring-zinc-500 rounded-full transition-colors text-sm">
          <Search className="w-5 h-5 text-zinc-500 dark:text-zinc-400 shrink-0 mr-3 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={handleSearchChange}
            onKeyDown={(e) => {
              if (e.key === 'Escape') handleClearSearch()
            }}
            placeholder="Cerca nelle lezioni..."
            className="w-full bg-transparent border-none text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 text-sm font-normal focus:outline-none py-1.5 pr-2"
          />
          {isSearching ? (
            <Loader2 className="w-4 h-4 text-zinc-400 animate-spin shrink-0" />
          ) : searchQuery ? (
            <button
              type="button"
              onClick={handleClearSearch}
              className="p-1 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors shrink-0"
              title="Cancella ricerca (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          ) : null}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 mt-4 custom-scrollbar min-w-[288px]">
        <div className="flex items-center justify-between mb-3 px-3">
          <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
            {isSearchActive ? `Risultati (${currentList.length})` : 'Recenti'}
          </p>
          {isSearchActive && (
            <button
              type="button"
              onClick={handleClearSearch}
              className="text-[11px] text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 font-medium transition-colors"
            >
              Mostra recenti
            </button>
          )}
        </div>

        <div className="space-y-1">
          {currentList.length === 0 && (
            <p className="text-sm text-zinc-400 px-3 mt-2">
              {isSearchActive
                ? isSearching
                  ? 'Ricerca in corso...'
                  : `Nessun risultato per "${searchQuery}".`
                : 'Nessuna trascrizione.'}
            </p>
          )}
          {currentList.map((item) => {
            const isSelected = currentRecordId === item.id
            const itemStyle = isSelected
              ? 'bg-zinc-200/80 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-medium'
              : 'hover:bg-zinc-100 dark:hover:bg-zinc-800/60 text-zinc-700 dark:text-zinc-300'

            return (
              <div
                key={item.id}
                onClick={() => onSelectRecord(item)}
                className={`group w-full text-left py-2 px-3 rounded-xl cursor-pointer flex flex-col justify-center transition-colors min-h-[48px] ${itemStyle}`}
              >
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-3 overflow-hidden flex-1">
                    <MessageSquare
                      className={`w-4 h-4 shrink-0 ${
                        isSelected ? 'text-zinc-900 dark:text-zinc-100' : 'text-zinc-400'
                      }`}
                    />
                    <span
                      className={`text-sm truncate ${isSelected ? 'font-medium' : ''}`}
                      title={item.filename}
                    >
                      {item.filename.replace(/^\d+_/, '')}
                    </span>
                  </div>
                  <div className="flex items-center shrink-0 ml-2">
                    <span className="text-xs text-zinc-400 font-medium whitespace-nowrap group-hover:hidden">
                      {getRelativeSidebar(item.created_at)}
                    </span>
                    <div className="hidden group-hover:flex items-center gap-1">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          onDeleteClick(item)
                        }}
                        title="Elimina"
                        className="p-1 bg-white dark:bg-zinc-700 hover:bg-red-50 hover:border-red-200 dark:hover:bg-red-900/50 dark:hover:border-red-800 rounded transition-all shadow-sm border border-zinc-200 dark:border-zinc-600 group/btn"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-zinc-500 group-hover/btn:text-red-500 shrink-0" />
                      </button>
                    </div>
                  </div>
                </div>

                {isSearchActive && item.snippet && (
                  <div
                    className="mt-1.5 pl-7 pr-2 text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2 leading-relaxed [&_mark]:bg-amber-200 dark:[&_mark]:bg-amber-900/60 dark:[&_mark]:text-amber-200 [&_mark]:text-zinc-900 [&_mark]:rounded-xs [&_mark]:px-1 [&_mark]:font-medium"
                    dangerouslySetInnerHTML={{ __html: item.snippet }}
                  />
                )}
              </div>
            )
          })}
        </div>
      </div>

      <div className="p-4 mt-auto min-w-[288px]">
        <button
          type="button"
          onClick={onOpenSettings}
          className="w-full py-2.5 px-4 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 rounded-xl flex items-center gap-3 transition-colors text-sm font-medium text-zinc-700 dark:text-zinc-300"
        >
          <Settings className="w-5 h-5 text-zinc-500 dark:text-zinc-400 shrink-0" />
          Impostazioni
        </button>
      </div>
    </aside>
  )
}

