import { useState, useEffect, useRef } from 'react'
import {
  FileAudio,
  Menu,
  Plus,
  MessageSquare,
  Trash2,
  Settings,
  Search,
  X,
  Loader2,
  Layers,
  Pencil,
  MoreVertical,
  BookOpen,
  Check,
} from 'lucide-react'
import { getRelativeSidebar } from '../../utils/dateUtils'
import { searchTranscriptions } from '../../services/api'

export default function Sidebar({
  historyList = [],
  courses = [],
  selectedCourseId = null,
  onSelectCourse = () => {},
  onCreateCourse = () => {},
  onEditCourse = () => {},
  onAssignCourse = () => {},
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
  const [openMenuId, setOpenMenuId] = useState(null)
  const [menuPlacement, setMenuPlacement] = useState('down')
  const menuRef = useRef(null)
  const scrollContainerRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpenMenuId(null)
      }
    }
    if (openMenuId !== null) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [openMenuId])

  useEffect(() => {
    const handleScroll = () => {
      if (openMenuId !== null) {
        setOpenMenuId(null)
      }
    }
    const container = scrollContainerRef.current
    if (container && openMenuId !== null) {
      container.addEventListener('scroll', handleScroll, { passive: true })
    }
    return () => {
      if (container) {
        container.removeEventListener('scroll', handleScroll)
      }
    }
  }, [openMenuId])

  const handleToggleMenu = (e, itemId) => {
    e.stopPropagation()
    if (openMenuId === itemId) {
      setOpenMenuId(null)
    } else {
      const rect = e.currentTarget.getBoundingClientRect()
      const spaceBelow = window.innerHeight - rect.bottom
      setMenuPlacement(spaceBelow < 260 ? 'up' : 'down')
      setOpenMenuId(itemId)
    }
  }

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

  const activeCourse = courses.find((c) => c.id === selectedCourseId)

  const filteredHistory = selectedCourseId
    ? historyList.filter((item) => item.course_id === selectedCourseId)
    : historyList

  const currentList = isSearchActive
    ? searchResults.filter((item) =>
        selectedCourseId ? item.course_id === selectedCourseId : true
      )
    : filteredHistory

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

      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-scroll px-3 mt-4 custom-scrollbar min-w-[288px] space-y-5 [scrollbar-gutter:stable]"
      >
        <div>
          <div className="flex items-center justify-between mb-2 px-3">
            <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              Corsi
            </p>
            <button
              type="button"
              onClick={onCreateCourse}
              className="p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md transition-colors"
              title="Nuovo Corso"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-1">
            <button
              type="button"
              onClick={() => onSelectCourse(null)}
              className={`w-full text-left py-2 px-3 rounded-xl flex items-center justify-between transition-colors min-h-[48px] ${
                selectedCourseId === null
                  ? 'bg-zinc-200/80 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-medium'
                  : 'hover:bg-zinc-100 dark:hover:bg-zinc-800/60 text-zinc-700 dark:text-zinc-300'
              }`}
            >
              <div className="flex items-center gap-2.5 overflow-hidden">
                <Layers
                  className={`w-4 h-4 shrink-0 ${
                    selectedCourseId === null
                      ? 'text-zinc-900 dark:text-zinc-100'
                      : 'text-zinc-400'
                  }`}
                />
                <span className="truncate text-sm">Tutte le lezioni</span>
              </div>
              <span className="text-xs text-zinc-400 font-medium px-2 py-0.5 rounded-full bg-zinc-200/50 dark:bg-zinc-800 shrink-0">
                {historyList.length}
              </span>
            </button>

            {courses.map((course) => {
              const isSelected = selectedCourseId === course.id
              return (
                <div
                  key={course.id}
                  onClick={() => onSelectCourse(course.id)}
                  className={`group w-full text-left py-2 px-3 rounded-xl flex items-center justify-between transition-colors min-h-[48px] cursor-pointer ${
                    isSelected
                      ? 'bg-zinc-200/80 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-medium'
                      : 'hover:bg-zinc-100 dark:hover:bg-zinc-800/60 text-zinc-700 dark:text-zinc-300'
                  }`}
                >
                  <div className="flex items-center gap-2.5 overflow-hidden flex-1 mr-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0 shadow-xs"
                      style={{ backgroundColor: course.color }}
                    />
                    <span className="truncate text-sm" title={course.name}>
                      {course.name}
                    </span>
                  </div>
                  <div className="relative w-8 h-7 flex items-center justify-end shrink-0">
                    <span className="text-xs text-zinc-400 font-medium px-2 py-0.5 rounded-full bg-zinc-200/50 dark:bg-zinc-800 group-hover:opacity-0 transition-opacity">
                      {course.transcriptions_count || 0}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        onEditCourse(course)
                      }}
                      title="Modifica Corso"
                      className="absolute inset-0 m-auto w-7 h-7 flex items-center justify-center opacity-0 group-hover:opacity-100 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-white dark:hover:bg-zinc-700 rounded-lg transition-all shadow-2xs border border-zinc-200 dark:border-zinc-700"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2 px-3">
            <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider truncate">
              {isSearchActive
                ? `Risultati (${currentList.length})`
                : activeCourse
                ? `${activeCourse.name} (${currentList.length})`
                : 'Recenti'}
            </p>
            {(isSearchActive || selectedCourseId !== null) && (
              <button
                type="button"
                onClick={() => {
                  handleClearSearch()
                  onSelectCourse(null)
                }}
                className="text-[11px] text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 font-medium transition-colors shrink-0 ml-2"
              >
                Mostra tutte
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
                  : selectedCourseId
                  ? 'Nessuna lezione in questo corso.'
                  : 'Nessuna trascrizione.'}
              </p>
            )}
            {currentList.map((item) => {
              const isSelected = currentRecordId === item.id
              const isMenuOpen = openMenuId === item.id
              const itemStyle = isSelected
                ? 'bg-zinc-200/80 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-medium'
                : 'hover:bg-zinc-100 dark:hover:bg-zinc-800/60 text-zinc-700 dark:text-zinc-300'

              return (
                <div
                  key={item.id}
                  onClick={() => onSelectRecord(item)}
                  className={`group w-full text-left py-2 px-3 rounded-xl cursor-pointer flex flex-col justify-center transition-colors min-h-[48px] relative ${itemStyle}`}
                >
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2.5 overflow-hidden flex-1 mr-2">
                      {item.course_color ? (
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: item.course_color }}
                          title={item.course_name || 'Corso'}
                        />
                      ) : (
                        <MessageSquare
                          className={`w-4 h-4 shrink-0 ${
                            isSelected
                              ? 'text-zinc-900 dark:text-zinc-100'
                              : 'text-zinc-400'
                          }`}
                        />
                      )}
                      <span
                        className={`text-sm truncate ${
                          isSelected ? 'font-medium' : ''
                        }`}
                        title={item.filename}
                      >
                        {item.filename.replace(/^\d+_/, '')}
                      </span>
                    </div>

                    <div className="flex items-center shrink-0">
                      <span
                        className={`text-xs text-zinc-400 font-medium whitespace-nowrap ${
                          isMenuOpen ? 'hidden' : 'group-hover:hidden'
                        }`}
                      >
                        {getRelativeSidebar(item.created_at)}
                      </span>

                      <div
                        className={`${
                          isMenuOpen ? 'flex' : 'hidden group-hover:flex'
                        } items-center`}
                      >
                        <button
                          type="button"
                          onClick={(e) => handleToggleMenu(e, item.id)}
                          title="Opzioni lezione"
                          className="p-1 bg-white dark:bg-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-600 rounded transition-all shadow-2xs border border-zinc-200 dark:border-zinc-600 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                        >
                          <MoreVertical className="w-3.5 h-3.5 shrink-0" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {isMenuOpen && (
                    <div
                      ref={menuRef}
                      onClick={(e) => e.stopPropagation()}
                      className={`absolute right-2 ${
                        menuPlacement === 'up' ? 'bottom-full mb-1.5' : 'top-full mt-1.5'
                      } w-52 bg-white dark:bg-[#18181b] border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150 text-xs`}
                    >
                      <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                        <BookOpen className="w-3 h-3" />
                        <span>Sposta nel corso</span>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          onAssignCourse(item.id, null)
                          setOpenMenuId(null)
                        }}
                        className={`w-full text-left px-3 py-1.5 flex items-center justify-between hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors ${
                          !item.course_id
                            ? 'text-zinc-900 dark:text-zinc-100 font-medium'
                            : 'text-zinc-600 dark:text-zinc-400'
                        }`}
                      >
                        <span>Nessun corso</span>
                        {!item.course_id && <Check className="w-3.5 h-3.5" />}
                      </button>

                      <div className="max-h-36 overflow-y-auto custom-scrollbar">
                        {courses.map((c) => {
                          const isAssigned = item.course_id === c.id
                          return (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => {
                                onAssignCourse(item.id, c.id)
                                setOpenMenuId(null)
                              }}
                              className={`w-full text-left px-3 py-1.5 flex items-center justify-between hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors ${
                                isAssigned
                                  ? 'text-zinc-900 dark:text-zinc-100 font-medium'
                                  : 'text-zinc-700 dark:text-zinc-300'
                              }`}
                            >
                              <div className="flex items-center gap-2 truncate mr-2">
                                <span
                                  className="w-2 h-2 rounded-full shrink-0"
                                  style={{ backgroundColor: c.color }}
                                />
                                <span className="truncate">{c.name}</span>
                              </div>
                              {isAssigned && <Check className="w-3.5 h-3.5 shrink-0" />}
                            </button>
                          )
                        })}
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setOpenMenuId(null)
                          onCreateCourse()
                        }}
                        className="w-full text-left px-3 py-1.5 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center gap-1.5 transition-colors font-medium border-t border-zinc-100 dark:border-zinc-800/60 mt-1 pt-1.5"
                      >
                        <Plus className="w-3 h-3 text-zinc-400" />
                        <span>Nuovo corso...</span>
                      </button>

                      <div className="h-px bg-zinc-100 dark:bg-zinc-800 my-1" />

                      <button
                        type="button"
                        onClick={() => {
                          setOpenMenuId(null)
                          onDeleteClick(item)
                        }}
                        className="w-full text-left px-3 py-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 flex items-center gap-2 transition-colors font-medium"
                      >
                        <Trash2 className="w-3.5 h-3.5 shrink-0" />
                        <span>Elimina lezione</span>
                      </button>
                    </div>
                  )}

                  {isSearchActive && item.snippet && (
                    <div
                      className="mt-1.5 pl-6 pr-2 text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2 leading-relaxed [&_mark]:bg-amber-200 dark:[&_mark]:bg-amber-900/60 dark:[&_mark]:text-amber-200 [&_mark]:text-zinc-900 [&_mark]:rounded-xs [&_mark]:px-1 [&_mark]:font-medium"
                      dangerouslySetInnerHTML={{ __html: item.snippet }}
                    />
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <div className="p-4 mt-auto min-w-[288px] border-t border-zinc-100 dark:border-zinc-800/80">
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
